/**
 * LoginPage — shown when the user is not authenticated.
 * Clicking "Sign in with Google" navigates to the backend OAuth initiation route.
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          AI SAATHI
        </h1>
        <p className="text-gray-400 text-sm">
          Your intelligent financial companion
        </p>
        <button
          onClick={() => {
            window.location.href = "/auth/google";
          }}
          className="px-6 py-3 bg-yellow-400 text-gray-950 font-semibold rounded-lg hover:bg-yellow-300 transition"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
