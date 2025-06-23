import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import apiClient from '../services/apiClient';
import { isTokenValid } from '../utils/isTokenValid';

const Dashboard = () => {
  const navigate = useNavigate();
  const { token, updateToken, loginUser, storeLoginSessionId } = useAuth();

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const tokenFromURL = queryParams.get('token');

    if (tokenFromURL && isTokenValid(tokenFromURL)) {
      updateToken(tokenFromURL);
    } else {
      navigate('/');
    }
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (window.__hasLoggedInOnce) {
        return; // Prevent second call in StrictMode
      }
      window.__hasLoggedInOnce = true;

      try {
        let res;

        if (import.meta.env.VITE_TOKEN_EXTRACT) {
          res = await apiClient.post(import.meta.env.VITE_TOKEN_EXTRACT, {
            token,
          });
          console.log('res data=> ', res.data);
          if (res.status === 200) {
            const { name, group } = res.data;
            loginUser({ name, group, token });

            // ✅ Directly store hardcoded login session id
            // storeLoginSessionId(loginSessionId);
            console.log('Login data logged successfully.');

            navigate('/home');
          }
        } else {
          res = await apiClient.post('/saml/token/extract', null, {
            params: {
              token,
            },
          });
          console.log('res data=> ', res.data);
          if (res.status === 200) {
            const { name, group } = res.data.user_data;
            loginUser({ name, group, token });

            // ✅ Directly store hardcoded login session id
            // storeLoginSessionId(loginSessionId);
            console.log('Login data logged successfully.');

            navigate('/home');
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        navigate('/');
      }
    };

    token && fetchUserData();
  }, [token, loginUser, navigate, updateToken, storeLoginSessionId]);

  return (
    <div className='min-h-screen flex items-center flex-col gap-4 justify-center'>
      <div className='h-10 w-10 bg-[#021A32] rounded-full animate-bounce'></div>
      <h1>Loading...</h1>
    </div>
  );
};

export default Dashboard;
