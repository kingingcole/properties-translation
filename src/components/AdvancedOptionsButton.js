const AdvancedOptionsButton = ({ isVisible, toggleAdvancedOptions }) => {
  return (
    <div className="mb-4">
      <button
        type='button'
        className="text-sm text-indigo-500 hover:text-indigo-700 cursor-pointer flex items-center"
        onClick={toggleAdvancedOptions}
      >
        {isVisible ? (
          <>
            Advanced Options
            <svg
              className="ml-1 h-4 w-4 transform rotate-180"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
        </>
        ) : (
          <>
            Advanced Options
            <svg
              className="ml-1 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </>
        )}
      </button>
    </div>
  )
}

export default AdvancedOptionsButton
