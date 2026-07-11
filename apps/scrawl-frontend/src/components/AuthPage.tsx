"use client";
export function AuthPage({ isSignin }: { isSignin: boolean }) {
  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <div className="p-6 m-2 flex flex-col items-center justify-center bg-white text-black rounded">
        <h1 className="font-bold text-3xl">Sign in</h1>
        <div className="p-2">
          <input
            className="rounded border-2 p-2"
            type="email"
            placeholder="Email"
          />
        </div>

        <div className="p-2">
          <input
            className="rounded border-2 p-2"
            type="password"
            placeholder="Password"
          />
        </div>

        <div className="p-2">
          <button
            className="border px-8 py-2 rounded-md bg-emerald-600 text-white hover:cursor-pointer hover:bg-emerald-900"
            onClick={() => {}}
          >
            {isSignin ? "Sign in" : "Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
