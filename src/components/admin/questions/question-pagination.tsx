type QuestionPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function QuestionPagination({
  currentPage,
  totalPages,
  onPageChange,
}: QuestionPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-sm font-bold text-gray-500">
        Page {currentPage} of {totalPages}
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-black text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-white"
        >
          Previous
        </button>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-black text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-white"
        >
          Next
        </button>
      </div>
    </div>
  );
}