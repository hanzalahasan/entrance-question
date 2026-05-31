type ConfirmDialogProps = {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <p className="text-center font-semibold text-gray-900 dark:text-white">{message}</p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-gray-300 py-3 font-black text-gray-700 dark:border-slate-700 dark:text-white"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-red-600 py-3 font-black text-white"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
