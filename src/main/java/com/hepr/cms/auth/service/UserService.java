package com.hepr.cms.auth.service;

import com.hepr.cms.auth.dto.UserCreateDTO;
import com.hepr.cms.auth.dto.UserPasswordDTO;
import com.hepr.cms.auth.dto.UserUpdateDTO;
import com.hepr.cms.auth.entity.User;
import com.hepr.cms.auth.vo.LoginVO;
import com.hepr.cms.auth.vo.UserVO;

import java.util.List;

public interface UserService {

    LoginVO login(String username, String rawPassword);

    UserVO getCurrentUser();

    List<UserVO> list();

    UserVO create(UserCreateDTO dto);

    UserVO update(UserUpdateDTO dto);

    void delete(String username);

    void resetPassword(String username, UserPasswordDTO dto);

    User findByUsername(String username);
}
