package io.reflectoring.demo.repository;

import io.reflectoring.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

import io.reflectoring.demo.entity.Role;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    List<User> findByRole(Role role);

    long countByRole(Role role);

    List<User> findByRoleIn(List<Role> roles);
}
