const ProgressBar = ({ progress }) => {
  return (
    <div className="relative pt-1">
      <div className="flex mb-2 items-center justify-between">
        <div>
          <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-teal-600 bg-teal-200">
            {progress < 100 ? 'Task in Progress' : 'Task Completed'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold inline-block text-teal-600">
            {progress % 1 === 0 ? progress.toFixed(0) : progress.toFixed(2)}% Complete
          </span>
        </div>
      </div>
      <div className="flex rounded-full bg-teal-200">
        <div
          style={{ width: `${progress}%` }}
          className="rounded-full bg-teal-500"
        ></div>
      </div>
    </div>
  )
}

export default ProgressBar;