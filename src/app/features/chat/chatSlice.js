import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import apiClient from '../../../services/apiClient';
import { toast } from 'react-toastify';



let getSessionId = () => {
  let id = sessionStorage.getItem('session_id');
  if (!id) {
    id = Date.now().toString();
    sessionStorage.setItem('session_id', id);
  }
  return id;
};

let getUserId = () => {
  let id = localStorage.getItem('user_id');
  if (!id) {
    id =
      'user_' +
      Date.now().toString() +
      Math.random().toString(36).substring(2, 8);
    localStorage.setItem('user_id', id);
  }
  return id;
};

const cleanAiResponse = (text) => {
  if (!text) return text;
  return text
    .replace(/\s*JSON list of used source numbers:\s*(\[\])?\s*$/gm, '')
    .trim();
};

const getFallbackCitation = () => ({
  id: '0',
  title: 'How to Create a PeopleSoft ESA to Aerotek Support Ticket',
  chunk: 'Please refer to this document for detailed instructions on how to raise a SNOW support ticket when you cannot find the information you are looking for.',
  parent_id:'https://sthubdevaioc273154123411.blob.core.windows.net/snowticket/How%20to%20Create%20a%20PeopleSoft%20ESA%20to%20Aerotek%20Support%20Ticket%20(1).docx',
  isSupportDoc: true
});

export const sendQuestionToAPI = createAsyncThunk(
  'chat/sendQuestionToAPI',
  async (question, { dispatch, getState }) => {
    const { chat, auth } = getState();
    const sessionId = chat.sessionId;
    const userId = chat.userId;
    const loginSessionId = auth.login_session_id || null;
    const userNameRaw = auth.user?.name;
    const userName = (Array.isArray(userNameRaw) && userNameRaw.length > 0)
      ? userNameRaw[0]
      : userNameRaw || 'Anonymous';

    console.log('Sending question to API:', question);
    console.log('Session ID:', sessionId);
    console.log('User ID:', userId);
    console.log('User Name:', userName);
    console.log('Login Session ID:', loginSessionId);

    dispatch(setFollowUps([]));

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };
    dispatch(addMessage(userMsg));

    const placeholderId = Date.now() + 1;
    dispatch(addMessage({
      id: placeholderId,
      role: 'agent',
      content: '...',
      ai_response: '...',
      citations: [],
      timestamp: new Date().toISOString(),
    }));
    dispatch(setPendingMessageId(placeholderId));
    dispatch(setIsResponding(true));

    try {
      const res = await apiClient.post('/ask', {
        query: question,
        user_id: userId,
        session_id: sessionId,
      }, { headers: { 'Content-Type': 'application/json' } });

      const data = res.data;
      console.log('API response:', data);

      if (data?.ai_response && Array.isArray(data.citations)) {
        const cleaned = cleanAiResponse(data.ai_response);
        let citations = data.citations.map(c => ({
          id: c.id,
          title: c.title,
          chunk: c.chunk,
          parent_id: c.parent_id
        }));

        if (citations.length === 0) {
          citations = [getFallbackCitation()];
          console.log('No citations found, adding fallback support document');
        }

        dispatch(updateMessageById({
          id: placeholderId,
          content: cleaned,
          ai_response: cleaned,
          citations,
          query: data.query
        }));

        if (data.follow_ups) {
          dispatch(setFollowUps(
            data.follow_ups.split('\n').map(q => q.trim()).filter(Boolean)
          ));
        }

        const logData = {
          chat_session_id: sessionId,
          user_id: userId,
          user_name: userName,
          query: question,
          ai_response: cleaned,
          citations: citations.map(c => c.title).join(', ') || 'No citations',
          login_session_id: loginSessionId
        };
        await apiClient.post('/log', logData);
        console.log('Chat interaction logged successfully:', logData);
      } else {
        throw new Error('Invalid API response: missing ai_response or citations');
      }
    } catch (err) {
      console.error('API error:', err);
      dispatch(updateMessageById({
        id: placeholderId,
        content: `Something went wrong: ${err.message}`,
        ai_response: `Something went wrong: ${err.message}`,
        citations: [],
        query: question
      }));
      dispatch(setError(err.message));
    } finally {
      dispatch(clearInput());
      dispatch(setPendingMessageId(null));
      dispatch(setIsResponding(false));
    }
  }
);

export const submitFeedback = createAsyncThunk(
  'chat/submitFeedback',
  async ({ messageId, type, text, messages }, { dispatch, getState }) => {
    const { chat, auth } = getState();
    const sessionId = chat.sessionId;
    const userId = chat.userId;
    const loginSessionId = auth.login_session_id || null;
    const userNameRaw = auth.user?.name;
    const userName = (Array.isArray(userNameRaw) && userNameRaw.length > 0)
      ? userNameRaw[0]
      : userNameRaw || 'Anonymous';

    console.log('Submitting feedback for message ID:', messageId);
    console.log('Login Session ID:', loginSessionId);

    const msg = messages.find(m => m.id === messageId);
    if (!msg) throw new Error('Message not found for feedback');

    const query = msg.query || messages.find(m => m.id < messageId && m.role === 'user')?.content || 'Unknown query';

    try {
      const res = await axios.post('https://app-azuresearch-qa-ps-esa.azurewebsites.net/feedback', {
        chat_session_id: sessionId,
        user_name: userName,
        query,
        ai_response: msg.ai_response || msg.content,
        citations: msg.citations?.map(c => c.title).join(', ') || 'No citations',
        feedback_type: type,
        feedback: text,
        login_session_id: loginSessionId,
        user_id: userId
      }, { headers: { 'Content-Type': 'application/json' } });

      dispatch(setFeedbackStatus({ messageId, status: { submitted: true, type } }));
      toast.success('Feedback submitted successfully!');
      return res.data;
    } catch (err) {
      console.error('Feedback API error:', err.response?.data || err.message);
      toast.error('Failed to submit feedback.');
      throw err;
    }
  }
);

const initialState = {
  messages: [],
  input: '',
  isResponding: false,
  error: null,
  pendingMessageId: null,
  followUps: [],
  feedbackStatus: {},
  samplePrompts: [
    'What is bullhorn',
    "Got any creative ideas for a 10-year-old's birthday?",
    'How do I make an HTTP request in JavaScript?',
    "What's the difference between React and Vue?",
  ],
  sessionId: getSessionId(),
  userId: getUserId(),
  previewDocURL: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setInput: (state, action) => { state.input = action.payload; },
    setPreviewDocURL: (state, action) => { state.previewDocURL = action.payload.url; },
    removePreviewDocURL: (state) => { state.previewDocURL = null; },
    addMessage: (state, action) => {
      const p = action.payload;
      if (p.role === 'agent') {
        p.ai_response = p.ai_response || p.content;
        p.citations = p.citations || [];
        p.query = p.query || '';
      }
      state.messages.push(p);
    },
    addPrompt: (state, action) => {
      state.messages = [{
        id: Date.now(),
        role: 'user',
        content: action.payload.text,
        timestamp: new Date().toISOString(),
      }];
    },
    setPendingMessageId: (state, action) => { state.pendingMessageId = action.payload; },
    updateMessageById: (state, action) => {
      const { id, content, ai_response, citations, query } = action.payload;
      const i = state.messages.findIndex(m => m.id === id);
      if (i !== -1) {
        state.messages[i] = {
          ...state.messages[i],
          content,
          ai_response: ai_response !== undefined ? ai_response : state.messages[i].ai_response,
          citations,
          query: query !== undefined ? query : state.messages[i].query,
        };
      }
    },
    setFollowUps: (state, action) => { state.followUps = action.payload; },
    setFeedbackStatus: (state, action) => {
      state.feedbackStatus[action.payload.messageId] = action.payload.status;
    },
    setIsResponding: (state, action) => { state.isResponding = action.payload; },
    setError: (state, action) => { state.error = action.payload; },
    clearChat: (state) => {
      state.messages = [];
      state.followUps = [];
      state.feedbackStatus = {};
      state.input = '';
      state.error = null;
      state.pendingMessageId = null;
      state.isResponding = false;
    },
    clearInput: (state) => { state.input = ''; },
    resetToWelcome: (state) => {
      state.messages = [];
      state.feedbackStatus = {};
      state.isResponding = false;
    },
    clearIfInputEmpty: (state) => {
      if (!state.input.trim()) {
        state.messages = [];
        state.followUps = [];
        state.feedbackStatus = {};
        state.isResponding = false;
      }
    },
    resetSessionId: (state) => {
      const id = Date.now().toString();
      sessionStorage.setItem('session_id', id);
      state.sessionId = id;
      console.log('Session ID reset to:', id);
      state.isResponding = false;
    },
    resetUserId: (state) => {
      const id = 'user_' + Date.now() + Math.random().toString(36).substring(2, 8);
      localStorage.setItem('user_id', id);
      state.userId = id;
      console.log('User ID reset to:', id);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendQuestionToAPI.rejected, (state, action) => {
        state.error = action.payload || action.error.message || 'An unexpected error occurred.';
        state.isResponding = false;
      })
      .addCase(submitFeedback.fulfilled, (state, action) => {
        console.log('Feedback submitted:', action.payload);
      })
      .addCase(submitFeedback.rejected, (state, action) => {
        console.error('Feedback failed:', action.error);
      });
  }
});

export const {
  setInput, setPreviewDocURL, removePreviewDocURL, addMessage, addPrompt,
  setPendingMessageId, updateMessageById, setFollowUps, setFeedbackStatus,
  setIsResponding, setError, clearChat, clearInput, resetToWelcome,
  clearIfInputEmpty, resetSessionId, resetUserId
} = chatSlice.actions;

export default chatSlice.reducer;
