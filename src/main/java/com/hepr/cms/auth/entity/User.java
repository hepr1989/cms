package com.hepr.cms.auth.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.hepr.cms.common.model.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("cms_user")
public class User extends BaseEntity {

    private String username;

    private String password;

    private String role;

    private Integer status;
}
