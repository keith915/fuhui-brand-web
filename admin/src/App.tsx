import { createContext, useContext, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Spin, Button, Space, Typography } from 'antd';
import {
  DashboardOutlined,
  NumberOutlined,
  PictureOutlined,
  ReadOutlined,
  FileTextOutlined,
  TeamOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { ApiError, User, logout as apiLogout, me } from './api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Metrics from './pages/Metrics';
import Panels from './pages/Panels';
import News from './pages/News';
import Blocks from './pages/Blocks';
import Users from './pages/Users';

const { Header, Sider, Content } = Layout;

type AuthValue = { user: User | null; setUser: (u: User | null) => void };
const AuthContext = createContext<AuthValue>({ user: null, setUser: () => {} });
export const useAuth = () => useContext(AuthContext);

const TITLES: Record<string, string> = {
  '/': '概览与发布',
  '/metrics': '运营数据',
  '/panels': '在营载体',
  '/news': '平台动态',
  '/blocks': '固定文案',
  '/users': '账号管理'
};

function Shell() {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const items = [
    { key: '/', icon: <DashboardOutlined />, label: '概览与发布' },
    { key: '/metrics', icon: <NumberOutlined />, label: '运营数据' },
    { key: '/panels', icon: <PictureOutlined />, label: '在营载体' },
    { key: '/news', icon: <ReadOutlined />, label: '平台动态' },
    { key: '/blocks', icon: <FileTextOutlined />, label: '固定文案' },
    ...(isAdmin ? [{ key: '/users', icon: <TeamOutlined />, label: '账号管理' }] : [])
  ];

  const handleLogout = async () => {
    await apiLogout();
    setUser(null);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={210} style={{ borderRight: '1px solid #e5e4e1' }}>
        <div className="brand">
          福汇官网后台
          <small>{user?.username} · {isAdmin ? '管理员' : '编辑'}</small>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={items}
          onClick={({ key }) => navigate(key)}
          style={{ borderInlineEnd: 'none' }}
        />
      </Sider>
      <Layout>
        <Header className="admin-head">
          <Typography.Text strong>{TITLES[location.pathname] || '后台'}</Typography.Text>
          <Space>
            <a href="/" target="_blank" rel="noreferrer">
              <Button type="text" icon={<ExportOutlined />}>查看官网</Button>
            </a>
            <Button onClick={handleLogout}>退出</Button>
          </Space>
        </Header>
        <Content className="admin-body">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="/panels" element={<Panels />} />
            <Route path="/news" element={<News />} />
            <Route path="/blocks" element={<Blocks />} />
            <Route
              path="/users"
              element={isAdmin ? <Users /> : <Navigate to="/" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    me()
      .then(setUser)
      .catch((err) => {
        if (!(err instanceof ApiError) || err.status !== 401) console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="boot"><Spin size="large" /></div>;

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {user ? <Shell /> : <Login />}
    </AuthContext.Provider>
  );
}
