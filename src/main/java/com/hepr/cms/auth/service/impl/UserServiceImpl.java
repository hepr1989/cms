package com.hepr.cms.auth.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.hepr.cms.auth.JwtTokenProvider;
import com.hepr.cms.auth.dto.UserCreateDTO;
import com.hepr.cms.auth.dto.UserPasswordDTO;
import com.hepr.cms.auth.dto.UserUpdateDTO;
import com.hepr.cms.auth.entity.User;
import com.hepr.cms.auth.mapper.UserMapper;
import com.hepr.cms.auth.service.UserService;
import com.hepr.cms.auth.vo.LoginVO;
import com.hepr.cms.auth.vo.UserVO;
import com.hepr.cms.common.exception.BusinessException;
import com.hepr.cms.common.exception.UnauthorizedException;
import com.hepr.cms.common.security.UserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private static final Pattern PWD_PATTERN =
            Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z0-9]).{8,}$");

    private final UserMapper userMapper;
    private final JwtTokenProvider jwtTokenProvider;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private void validatePassword(String password) {
        if (password == null || !PWD_PATTERN.matcher(password).matches()) {
            throw new BusinessException("密码需至少8位，包含大小写字母、数字和特殊字符");
        }
    }

    @Override
    public LoginVO login(String username, String rawPassword) {
        User user = findByUsername(username);
        if (user == null) {
            throw new UnauthorizedException("用户名或密码错误");
        }
        if (user.getStatus() != 1) {
            throw new UnauthorizedException("账号已被禁用");
        }
        // rawPassword 为前端 SHA-256 哈希后的字符串
        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            // 向后兼容：旧数据密码为明文 BCrypt，尝试匹配后自动升级
            // 此处无法逆推原始明文，旧账号需通过重置密码升级
            throw new UnauthorizedException("用户名或密码错误");
        }
        String token = jwtTokenProvider.generateToken(user.getUsername(), user.getRole());
        return new LoginVO(token, user.getUsername(), user.getRole());
    }

    @Override
    public UserVO getCurrentUser() {
        String username = UserContext.getUsername();
        if (username == null) {
            throw new UnauthorizedException("未登录");
        }
        User user = findByUsername(username);
        if (user == null) {
            throw new UnauthorizedException("用户不存在");
        }
        return toVO(user);
    }

    @Override
    public List<UserVO> list() {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.orderByDesc(User::getCreatedAt);
        return userMapper.selectList(wrapper).stream()
                .map(this::toVO)
                .collect(Collectors.toList());
    }

    @Override
    public UserVO create(UserCreateDTO dto) {
        User existing = findByUsername(dto.getUsername());
        if (existing != null) {
            throw new BusinessException("用户名已存在");
        }
        // 前端已做 SHA-256 哈希，此处跳过明文密码复杂度校验，直接 BCrypt 存储
        User user = new User();
        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setRole(dto.getRole() != null ? dto.getRole() : "USER");
        user.setStatus(1);
        userMapper.insert(user);
        return toVO(user);
    }

    @Override
    public UserVO update(UserUpdateDTO dto) {
        User user = findByUsername(dto.getUsername());
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        if (dto.getRole() != null) {
            user.setRole(dto.getRole());
        }
        if (dto.getStatus() != null) {
            user.setStatus(dto.getStatus());
        }
        userMapper.updateById(user);
        return toVO(user);
    }

    @Override
    public void delete(String username) {
        if ("admin".equals(username)) {
            throw new BusinessException("不能删除管理员账号");
        }
        User user = findByUsername(username);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        // 软删除前修改 username，释放唯一索引，允许重新创建同名用户
        String suffix = "_del_" + System.currentTimeMillis();
        int maxLen = 64; // username 字段长度 VARCHAR(64)
        String base = username.length() + suffix.length() > maxLen
                ? username.substring(0, maxLen - suffix.length())
                : username;
        user.setUsername(base + suffix);
        userMapper.updateById(user);
        userMapper.deleteById(user.getId());
    }

    @Override
    public void resetPassword(String username, UserPasswordDTO dto) {
        User user = findByUsername(username);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        // 前端已做 SHA-256 哈希，跳过明文复杂度校验，直接 BCrypt 存储
        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        userMapper.updateById(user);
    }

    @Override
    public User findByUsername(String username) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getUsername, username);
        return userMapper.selectOne(wrapper);
    }

    private UserVO toVO(User user) {
        UserVO vo = new UserVO();
        vo.setUsername(user.getUsername());
        vo.setRole(user.getRole());
        vo.setStatus(user.getStatus());
        vo.setCreatedAt(user.getCreatedAt());
        return vo;
    }
}
