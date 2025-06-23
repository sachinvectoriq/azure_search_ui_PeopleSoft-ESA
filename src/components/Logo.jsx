import { Link } from 'react-router-dom';
import miloLogo from '../assets/milo.png';

const Logo = () => {
  return (
    <h1 className='text-md flex items-center gap-2 font-semibold text-[#004AAD]'>
      <Link to='/'>
        <img src={miloLogo} alt='logo' className='w-10' />
      </Link>
    </h1>
  );
};

export default Logo;
