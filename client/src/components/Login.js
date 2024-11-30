import React, { useState } from 'react';
import { Form, Input, Button, Typography, Modal, Space } from 'antd';
import '../styles/Auth.css';
import '../styles/Dice.css';

const { Title, Text } = Typography;

function Login() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Invalid username or password. Please try again.');

  const handleLogin = async (values) => {
    try {
      setLoading(true);
      const res = await fetch('https://yahtzee-backend-621359075899.us-east1.run.app/api/players/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const error = await res.json();
        setErrorMessage(error.message || 'Invalid credentials');
        throw new Error(error.message || 'Invalid credentials');
      }

      const data = await res.json();
      localStorage.setItem('token', data.token);
      window.location.href = '/lobby'; // Redirect to the lobby
    } catch (err) {
      setIsModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  return (
    <div className="auth-page">
      <div className="dice-container">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="dice"></div>
        ))}
      </div>
      <Space
        direction="vertical"
        className="auth-space"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <div className="auth-container">
          <Title>Welcome to Yahtzee!</Title>
          <Title level={3} style={{ textAlign: 'left', color: 'red' }}>
            Login to start playing!
          </Title>
          <Form layout="vertical" onFinish={handleLogin}>
            <Form.Item
              label="Username"
              name="username"
              rules={[
                { required: true, message: 'Please input your username!' },
                { min: 4, message: 'Username must be at least 4 characters' },
              ]}
            >
              <Input placeholder="Enter your username" />
            </Form.Item>
            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: 'Please input your password!' },
                { min: 6, message: 'Password must be at least 6 characters' },
              ]}
            >
              <Input.Password placeholder="Enter your password" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Login
              </Button>
            </Form.Item>
          </Form>
          <Text style={{ display: 'block', textAlign: 'center' }}>
            Don’t have an account?{' '}
            <Button
              type="link"
              onClick={() => (window.location.href = '/signup')}
              className="link-button"
            >
              Sign Up
            </Button>
          </Text>
        </div>
      </Space>
      <Modal
        title={<span style={{ color: '#FF4500' }}>Login Failed</span>}
        visible={isModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button
            key="close"
            onClick={handleCancel}
            style={{
              backgroundColor: '#FF4500',
              borderColor: '#FF4500',
              color: '#FFFFFF',
            }}
          >
            Close
          </Button>,
        ]}
      >
        <Text type="danger" style={{ color: '#FF4500' }}>
          {errorMessage}
        </Text>
      </Modal>
    </div>
  );
}

export default Login;
