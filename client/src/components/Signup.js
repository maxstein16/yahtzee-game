import React, { useState } from 'react';
import { Form, Input, Button, Typography, Modal, Space } from 'antd';
import '../styles/Auth.css';
import '../styles/Dice.css';

const { Title, Text } = Typography;

function Signup() {
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleSignup = async (values) => {
    const { username, password, confirmPassword, name } = values;

    if (password !== confirmPassword) {
      Modal.error({
        title: 'Error',
        content: 'Passwords do not match!',
      });
      return;
    }

    try {
      const res = await fetch('https://yahtzee-backend-621359075899.us-east1.run.app/api/players/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Signup failed');
      }

      setIsModalVisible(true);
    } catch (err) {
      Modal.error({
        title: 'Error',
        content: `Signup failed: ${err.message}`,
      });
    }
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
      >
        <div className="auth-container">
          <Title>Sign Up</Title>
          <Form form={form} layout="vertical" onFinish={handleSignup}>
            <Form.Item
              label="Name"
              name="name"
              rules={[
                { required: true, message: 'Please input your name!' },
                { min: 2, message: 'Name must be at least 2 characters' },
              ]}
            >
              <Input placeholder="Enter your name" />
            </Form.Item>
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
            <Form.Item
              label="Confirm Password"
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match!'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Confirm your password" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Sign Up
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Space>
      <Modal
        title="Signup Successful"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="login" type="primary" onClick={() => (window.location.href = '/')}>
            Go to Login
          </Button>,
        ]}
      >
        <Text>You can now log in with your new account.</Text>
      </Modal>
    </div>
  );
}

export default Signup;
