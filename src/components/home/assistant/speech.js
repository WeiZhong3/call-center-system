import { IoMdPerson } from "react-icons/io";

function Speech({ role, content }) {
  return (
    <div className="text-sm my-4 flex flex-row gap-2">
      {role === "caller" && (
        <div className="rounded-full bg-accent p-1 text-white">
          <IoMdPerson size={20} />
        </div>
      )}
      <div className={`flex items-center w-full ${role==="agent" ? 'justify-end ':'justify-start'}`}>
        <div className={`max-w-[80%] ${role==="agent" ? 'bg-gray-100 rounded-lg p-3 ':'justify-start'}`}>
          {content}
        </div>
      </div>
    </div>
  );
}

export default Speech;
