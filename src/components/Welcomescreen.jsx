import { motion } from 'framer-motion';
import milo from '../assets/milo.png';  // adjust path based on actual location

const WelcomeScreen = () => {
  return (
    <motion.div
      id='welcome'
      className='flex flex-col items-center justify-center h-[70vh] p-8 text-center'
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <img 
        src={milo} 
        alt="Milo Bot" 
        className="w-35 h-35 mb-6 rounded-full shadow-lg"
      />
      <h1 className='text-4xl font-semibold mb-4 text-gray-800'>
        Start chatting
      </h1>
      <p className='text-gray-600'>
        This chatbot is configured to answer your questions
      </p>
    </motion.div>
  );
};

export default WelcomeScreen;
