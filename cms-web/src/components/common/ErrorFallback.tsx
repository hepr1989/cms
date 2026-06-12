import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function ErrorFallback() {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Result
        status="error"
        title="页面加载出错"
        subTitle="请尝试刷新页面或返回上一页"
        extra={[
          <Button key="reload" onClick={() => window.location.reload()}>刷新页面</Button>,
          <Button key="back" type="primary" onClick={() => navigate(-1)}>返回</Button>,
        ]}
      />
    </div>
  );
}
