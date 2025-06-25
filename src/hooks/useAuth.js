import { useSelector, useDispatch } from 'react-redux';
import {
  login,
  logout,
  setToken,
  removeToken,
  storeSessionId,
  storeLoginSessionId,
} from '../app/features/auth/authSlice';

const useAuth = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);

  const isLoggedIn = !!token;

  const loginUser = (userData) => {
    dispatch(login({ user: userData, token: userData.token }));
    localStorage.setItem('name', JSON.stringify(userData.name));
    localStorage.setItem('group', JSON.stringify(userData.group));
    localStorage.setItem('token', userData.token);
  };

  const logoutUser = () => {
    dispatch(logout());
  };

  const storeSession = (session_id) => {
    dispatch(storeSessionId(session_id));
    localStorage.setItem('session_id', session_id);
  };

  const updateToken = (newToken) => {
    dispatch(setToken(newToken));
  };

  const clearToken = () => {
    dispatch(removeToken());
  };

  const storeLoginSessionIdAction = (id) => {
    dispatch(storeLoginSessionId(id));
  };

  return {
    user,
    token,
    isLoggedIn,
    loginUser,
    logoutUser,
    updateToken,
    clearToken,
    storeSession,
    storeLoginSessionId: storeLoginSessionIdAction,
  };
};

export default useAuth;
