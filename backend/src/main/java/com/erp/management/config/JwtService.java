package com.erp.management.config;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service public class JwtService {
 private final SecretKey key;
 public JwtService(@Value("${app.jwt.secret}") String secret){ key=Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)); }
 public String createToken(Long id,String role){ return Jwts.builder().subject(id.toString()).claim("role",role).issuedAt(new Date()).expiration(new Date(System.currentTimeMillis()+604800000L)).signWith(key).compact(); }
}
