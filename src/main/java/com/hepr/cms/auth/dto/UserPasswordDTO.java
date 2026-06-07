package com.hepr.cms.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserPasswordDTO {

    private String oldPassword;

    @NotBlank(message = "新密码不能为空")
    private String newPassword;
}
