const Assignments = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Assignments</h1>

      <div className="grid grid-cols-2 gap-6">

        <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg hover:scale-105 transition">
          <h2 className="text-lg font-semibold">Pending</h2>
          <p className="text-sm opacity-80">Assignments not submitted</p>
        </div>

        <div className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl shadow-lg hover:scale-105 transition">
          <h2 className="text-lg font-semibold">Submitted</h2>
          <p className="text-sm opacity-80">Completed assignments</p>
        </div>

        <div className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl shadow-lg hover:scale-105 transition">
          <h2 className="text-lg font-semibold">Grades</h2>
          <p className="text-sm opacity-80">Marks & feedback</p>
        </div>

        <div className="p-6 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl shadow-lg hover:scale-105 transition">
          <h2 className="text-lg font-semibold">Deadlines</h2>
          <p className="text-sm opacity-80">Upcoming due dates</p>
        </div>

      </div>
    </div>
  );
};

export default Assignments;