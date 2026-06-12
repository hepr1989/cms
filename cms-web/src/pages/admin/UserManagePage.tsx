import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, message, Space, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, QuestionCircleOutlined, SearchOutlined } from '@ant-design/icons';
import type { UserVO, UserCreateDTO, UserUpdateDTO } from '@/types/auth';
import * as userApi from '@/api/user';
import { formatDateTime } from '@/utils/constants';
import { hashPassword } from '@/utils/crypto';

// 模块级缓存，防止 StrictMode 二次挂载时重复请求
let usersLoading = false;
let usersCache: UserVO[] | null = null;

// 密码复杂度：至少8位，包含大小写字母、数字、特殊字符
const PWD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]).{8,}$/;
const PWD_RULES = [
  { required: true, message: '请输入密码' },
  {
    pattern: PWD_REGEX,
    message: '密码需至少8位，包含大小写字母、数字和特殊字符',
  },
];
const PWD_TIP = (
  <Tooltip title={
    <ul style={{ margin: 0, paddingLeft: 16 }}>
      <li>至少 8 个字符</li>
      <li>包含大写字母（A-Z）</li>
      <li>包含小写字母（a-z）</li>
      <li>包含数字（0-9）</li>
      <li>包含特殊字符（如 !@#$% 等）</li>
    </ul>
  }>
    <QuestionCircleOutlined style={{ color: '#999', marginLeft: 4, cursor: 'pointer' }} />
  </Tooltip>
);

export default function UserManagePage() {
  const [users, setUsers] = useState<UserVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserVO | null>(null);
  const [form] = Form.useForm();

  const loadUsers = async (searchUsername?: string) => {
    // 模块级缓存仅用于初始加载防止 StrictMode 重复请求
    if (!searchUsername && usersLoading) {
      if (usersCache) setUsers(usersCache);
      return;
    }
    usersLoading = true;
    setLoading(true);
    try {
      const data = await userApi.listUsers(searchUsername) as unknown as UserVO[];
      if (!searchUsername) usersCache = data;
      setUsers(data);
    } catch (err: any) {
      message.error(err.message || '加载用户列表失败');
    } finally {
      usersLoading = false;
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ role: 'USER', status: 1 });
    setModalOpen(true);
  };

  const handleEdit = (record: UserVO) => {
    setEditingUser(record);
    form.setFieldsValue({ ...record });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        const dto: UserUpdateDTO = {
          username: values.username,
          role: values.role,
          status: values.status,
        };
        await userApi.updateUser(dto);
        message.success('更新成功');
      } else {
        const hashed = await hashPassword(values.password);
        const dto: UserCreateDTO = {
          username: values.username,
          password: hashed,
          role: values.role,
        };
        await userApi.createUser(dto);
        message.success('创建成功');
      }
      setModalOpen(false);
      loadUsers();
    } catch (err: any) {
      if (err.message) message.error(err.message);
    }
  };

  const handleDelete = async (username: string) => {
    try {
      await userApi.deleteUser(username);
      message.success('删除成功');
      loadUsers();
    } catch (err: any) {
      message.error(err.message || '删除失败');
    }
  };

  const handleResetPassword = async (username: string) => {
    Modal.confirm({
      title: '重置密码',
      okText: '确认',
      cancelText: '取消',
      content: (
        <div>
          <Input.Password
            id="new-password"
            placeholder="请输入新密码"
            autoComplete="new-password"
          />
          <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
            至少8位，含大小写字母、数字和特殊字符
          </div>
        </div>
      ),
      onOk: async () => {
        const el = document.getElementById('new-password') as HTMLInputElement;
        if (!el?.value) { message.error('请输入新密码'); return Promise.reject(); }
        if (!PWD_REGEX.test(el.value)) {
          message.error('密码需至少8位，包含大小写字母、数字和特殊字符');
          return Promise.reject();
        }
        try {
          const hashed = await hashPassword(el.value);
          await userApi.resetPassword(username, { newPassword: hashed });
          message.success('密码重置成功');
        } catch (err: any) {
          message.error(err.message || '重置失败');
        }
      },
    });
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '角色', dataIndex: 'role', key: 'role', render: (v: string) => v === 'ADMIN' ? '管理员' : '普通用户' },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (v: number) => v === 1 ? '启用' : '禁用',
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => formatDateTime(v) },
    {
      title: '操作', key: 'action',
      render: (_: any, record: UserVO) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" size="small" onClick={() => handleResetPassword(record.username)}>重置密码</Button>
          {record.username !== 'admin' && (
            <Popconfirm title="确定删除该用户？" onConfirm={() => handleDelete(record.username)}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>用户管理</h2>
        <Space>
          <Input.Search
            placeholder="搜索用户名"
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={(val) => loadUsers(val || undefined)}
            style={{ width: 200 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新增用户</Button>
        </Space>
      </div>
      <Table columns={columns} dataSource={users} rowKey="username" loading={loading} />

      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input disabled={!!editingUser} autoComplete="off" />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              name="password"
              label={<span>密码{PWD_TIP}</span>}
              rules={PWD_RULES}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          )}
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="USER">普通用户</Select.Option>
              <Select.Option value="ADMIN">管理员</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="状态" valuePropName="checked"
            getValueFromEvent={(checked: boolean) => checked ? 1 : 0}
            getValueProps={(value: number) => ({ checked: value === 1 })}>
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
