import { Spin } from 'antd';

interface PageLoadingProps {
  tip?: string;
}

/** 页面级加载蒙层：居中 Spin + 半透明背景覆盖整个内容区域 */
export default function PageLoading({ tip = '加载中...' }: PageLoadingProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(255, 255, 255, 0.6)',
      zIndex: 100,
    }}>
      <Spin size="large" tip={tip}>
        <div style={{ padding: 40 }} />
      </Spin>
    </div>
  );
}
