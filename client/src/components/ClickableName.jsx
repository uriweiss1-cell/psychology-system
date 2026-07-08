import { useContext } from 'react';
import { EmployeeCardContext } from '../App';

export default function ClickableName({ name, className = '' }) {
  const { openCardByName } = useContext(EmployeeCardContext);
  return (
    <button
      type="button"
      className={`cursor-pointer hover:underline hover:text-blue-700 transition-colors ${className}`}
      onClick={() => openCardByName(name)}
    >
      {name}
    </button>
  );
}
