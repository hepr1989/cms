import { useState } from 'react';
import { Modal, Form, Input, Radio, Spin, message } from 'antd';
import { useUIStore } from '@/store/ui-store';
import { createFolder, updateFolder, getFolder } from '@/api/folder';
import { useTreeStore } from '@/store/tree-store';
import type { FolderVO } from '@/types';

export default function FolderFormModal() {
  const [form] = Form.useForm();
  const activeModal = useUIStore(s => s.activeModal);
  const closeModal = useUIStore(s => s.closeModal);
  const addFolderNode = useTreeStore(s => s.addFolderNode);
  const updateNode = useTreeStore(s => s.updateNode);
  const refreshChildren = useTreeStore(s => s.refreshChildren);

  const isEdit = activeModal === 'folderEdit';
  const visible = activeModal === 'folderCreate' || activeModal === 'folderEdit';
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (isEdit) {
        const result = await updateFolder(values) as unknown as FolderVO;
        message.success('修改成功');
        updateNode(`folder-${result.folderCode}`, { title: result.title, status: result.status });
      } else {
        const result = await createFolder(values) as unknown as FolderVO;
        message.success('创建成功');
        const parentKey = result.parentFolderCode === '-1' ? '-1' : `folder-${result.parentFolderCode}`;
        addFolderNode(parentKey, result);
        if (parentKey !== '-1') refreshChildren(parentKey);
      }
      closeModal();
    } catch (e: any) {
      // form.validateFields() rejection shows inline errors, no need for message
      if (e.message) message.error(e.message || '操作失败');
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑栏目' : '新增栏目'}
      open={visible}
      onOk={handleOk}
      onCancel={closeModal}
      confirmLoading={loading}
      afterOpenChange={async (open) => {
        if (open) {
          form.resetFields();
          const props = useUIStore.getState().modalProps;
          if (isEdit && props.folderCode) {
            setLoading(true);
            try {
              const folder = await getFolder(props.folderCode) as unknown as FolderVO;
              form.setFieldsValue({
                folderCode: folder.folderCode,
                title: folder.title,
                description: folder.description,
                status: folder.status,
              });
            } catch {
              message.error('加载栏目信息失败');
            } finally {
              setLoading(false);
            }
          } else if (!isEdit) {
            form.setFieldsValue({ parentFolderCode: props.parentFolderCode || '-1' });
          }
        } else {
          form.resetFields();
        }
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="标题" rules={[{ required: true, message: '标题不能为空' }, { min: 3, message: '标题至少3个字符' }]}>
          <Input maxLength={255} />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea maxLength={512} rows={3} />
        </Form.Item>
        {isEdit && (
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value={1}>正常</Radio>
              <Radio value={0}>不可用</Radio>
            </Radio.Group>
          </Form.Item>
        )}
        {!isEdit && <Form.Item name="parentFolderCode" hidden><Input /></Form.Item>}
        {isEdit && <Form.Item name="folderCode" hidden><Input /></Form.Item>}
      </Form>
    </Modal>
  );
}
