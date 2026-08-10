package com.erp.management.controller;

import com.erp.management.config.JwtService;
import com.erp.management.dto.AuthRequest;
import com.erp.management.entity.PasswordResetToken;
import com.erp.management.entity.User;
import com.erp.management.repository.PasswordResetTokenRepository;
import com.erp.management.repository.UserRepository;
import jakarta.validation.constraints.Email;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final UserRepository users;
    private final PasswordResetTokenRepository resetTokens;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final JavaMailSender mailSender;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${app.mail.from:}")
    private String mailFrom;

    private final SecureRandom secureRandom = new SecureRandom();

    public AuthController(
            UserRepository users,
            PasswordResetTokenRepository resetTokens,
            PasswordEncoder encoder,
            JwtService jwt,
            JavaMailSender mailSender) {
        this.users = users;
        this.resetTokens = resetTokens;
        this.encoder = encoder;
        this.jwt = jwt;
        this.mailSender = mailSender;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody AuthRequest r) {
        String name = clean(r.name);
        String email = clean(r.email);
        String phone = clean(r.phone);

        if (name == null || clean(r.password) == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Name and password are required."));
        }
        if (r.password.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("message", "Password must be at least 8 characters."));
        }
        if (email == null && phone == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email or phone is required."));
        }
        if (email != null && !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Enter a valid email address."));
        }
        if (phone != null && users.existsByPhone(phone)) {
            return ResponseEntity.badRequest().body(Map.of("message", "A user with this phone already exists."));
        }
        if (email != null && users.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "A user with this email already exists."));
        }

        User u = new User();
        u.name = name;
        u.phone = phone;
        u.email = email;
        u.password = encoder.encode(r.password);
        u.role = "owner";
        u.createdAt = Instant.now();
        u.updatedAt = Instant.now();

        u = users.save(u);
        String token = jwt.createToken(u.id, u.role);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Account created successfully.",
                "token", token,
                "user", userPayload(u)
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest r) {
        String identifier = clean(r.email);
        if (identifier == null) identifier = clean(r.phone);

        if (identifier == null || clean(r.password) == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email/phone and password are required."));
        }

        Optional<User> result = users.findByEmail(identifier);
        if (result.isEmpty()) result = users.findByPhone(identifier);

        if (result.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid email/phone or password."));
        }

        User u = result.get();
        if (!encoder.matches(r.password, u.password)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid email/phone or password."));
        }

        return ResponseEntity.ok(Map.of(
                "token", jwt.createToken(u.id, u.role),
                "user", userPayload(u)
        ));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody AuthRequest r) {
        String email = clean(r.email);

        // Always return the same response so attackers cannot enumerate registered emails.
        String generic = "If an account exists for that email, a password reset link has been sent.";

        if (email == null || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            return ResponseEntity.ok(Map.of("message", generic));
        }

        Optional<User> result = users.findByEmail(email);
        if (result.isEmpty()) {
            return ResponseEntity.ok(Map.of("message", generic));
        }

        User user = result.get();
        resetTokens.deleteAll(
                resetTokens.findAll().stream()
                        .filter(t -> t.user != null && Objects.equals(t.user.id, user.id) && !t.used)
                        .toList()
        );

        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        PasswordResetToken reset = new PasswordResetToken(
                sha256(rawToken),
                user,
                Instant.now().plusSeconds(15 * 60)
        );
        resetTokens.save(reset);

        String resetLink = frontendUrl.replaceAll("/+$", "") + "/?resetToken=" + rawToken;

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (mailFrom != null && !mailFrom.isBlank()) message.setFrom(mailFrom);
            message.setTo(user.email);
            message.setSubject("ERP password reset");
            message.setText(
                    "Hello " + user.name + ",\n\n" +
                    "We received a request to reset your ERP password.\n\n" +
                    "Reset your password using this link:\n" + resetLink + "\n\n" +
                    "This link expires in 15 minutes and can be used only once.\n\n" +
                    "If you did not request this, you can ignore this email."
            );
            mailSender.send(message);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(
                    Map.of("message", "Password reset email could not be sent. Please configure SMTP settings on the server.")
            );
        }

        return ResponseEntity.ok(Map.of("message", generic));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody AuthRequest r) {
        String rawToken = clean(r.resetToken);
        String password = clean(r.password);

        if (rawToken == null || password == null || password.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("message", "A valid reset token and a password of at least 8 characters are required."));
        }

        Optional<PasswordResetToken> found = resetTokens.findByTokenHashAndUsedFalse(sha256(rawToken));
        if (found.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "This reset link is invalid or has already been used."));
        }

        PasswordResetToken reset = found.get();
        if (reset.expiresAt.isBefore(Instant.now())) {
            return ResponseEntity.badRequest().body(Map.of("message", "This reset link has expired. Please request a new one."));
        }

        User user = reset.user;
        user.password = encoder.encode(password);
        user.updatedAt = Instant.now();
        users.save(user);

        reset.used = true;
        resetTokens.save(reset);

        return ResponseEntity.ok(Map.of("message", "Password reset successfully. You can now log in."));
    }

    private Map<String, Object> userPayload(User u) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", u.id);
        result.put("name", u.name);
        result.put("email", u.email == null ? "" : u.email);
        result.put("phone", u.phone == null ? "" : u.phone);
        result.put("role", u.role);
        return result;
    }

    private String clean(String value) {
        if (value == null) return null;
        String v = value.trim();
        return v.isBlank() ? null : v;
    }

    private String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : digest) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash reset token", ex);
        }
    }
}
