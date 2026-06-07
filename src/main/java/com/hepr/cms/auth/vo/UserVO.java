package com.hepr.cms.auth.vo;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserVO {

    private String username;
    private String role;
    private Integer status;
    private LocalDateTime createdAt;
}
