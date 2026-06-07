import React, { useState, useCallback, useEffect } from 'react';
import { Input, Button, Dropdown, Typography } from 'antd';
import { MenuOutlined, HomeOutlined, UserOutlined, LogoutOutlined, SettingOutlined, TeamOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSearchStore } from '@/store/search-store';
import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { DEBOUNCE_DELAY } from '@/utils/constants';

const { Text } = Typography;

export default function HeaderBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const search = useSearchStore(s => s.search);
  const results = useSearchStore(s => s.results);
  const showDropdown = useSearchStore(s => s.showDropdown);
  const clearSearch = useSearchStore(s => s.clearSearch);
  const setShowDropdown = useSearchStore(s => s.setShowDropdown);
  const toggleSidebar = useUIStore(s => s.toggleSidebar);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const loadUser = useAuthStore(s => s.loadUser);
  const token = useAuthStore(s => s.token);
  const [inputValue, setInputValue] = useState('');
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (token && !user) {
      loadUser();
    }
  }, [token, user, loadUser]);

  const handleSearch = useCallback((value: string) => {
    setInputValue(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) { clearSearch(); return; }
    timerRef.current = setTimeout(() => search(value, !isAdmin), DEBOUNCE_DELAY);
  }, [search, clearSearch, isAdmin]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const userMenuItems = [
    { key: 'users', label: '用户管理', icon: <TeamOutlined />, onClick: () => navigate('/admin/users') },
    { key: 'permissions', label: '权限配置', icon: <SafetyOutlined />, onClick: () => navigate('/admin/permissions') },
    { type: 'divider' as const },
    { key: 'logout', label: '退出登录', icon: <LogoutOutlined />, onClick: handleLogout },
  ];

  const regularUserMenuItems = [
    { key: 'logout', label: '退出登录', icon: <LogoutOutlined />, onClick: handleLogout },
  ];

  return (
    <div className="header-bar">
      <div className="header-left">
        <Button type="text" icon={<MenuOutlined />} onClick={toggleSidebar} className="menu-btn" />
        <span className="logo" onClick={() => navigate('/')}>CMS 知识库</span>
      </div>
      <div className="header-center">
        <Input.Search
          placeholder="请输入关键词..."
          value={inputValue}
          onChange={e => handleSearch(e.target.value)}
          onSearch={v => { if (v.trim()) search(v, !isAdmin); }}
          style={{ maxWidth: 400 }}
          allowClear
          onClear={clearSearch}
        />
        {showDropdown && results.length > 0 && (
          <div className="search-dropdown">
            {results.map(r => (
              <div key={r.articleCode} className="search-item" onClick={() => {
                navigate(`${isAdmin ? '/admin' : '/portal'}/article/${r.articleCode}`);
                setShowDropdown(false);
              }}>
                <div className="search-item-title">{r.title}</div>
                {r.contentSnippet && <div className="search-item-snippet">{r.contentSnippet}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="header-right">
        {isAdmin && (
          <>
            <Button type="text" icon={<HomeOutlined />}
              onClick={() => navigate('/portal')}>
              前台
            </Button>
            {token && (
              <Dropdown menu={{ items: user?.role === 'ADMIN' ? userMenuItems : regularUserMenuItems }} placement="bottomRight">
                <Button type="text" icon={<UserOutlined />}>
                  {user?.username || '用户'}
                </Button>
              </Dropdown>
            )}
          </>
        )}
      </div>
    </div>
  );
}
