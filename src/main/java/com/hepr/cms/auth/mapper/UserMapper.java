package com.hepr.cms.auth.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.hepr.cms.auth.entity.User;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<User> {
}
