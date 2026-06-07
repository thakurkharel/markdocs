import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#171717",
          borderRadius: 36,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          width={120}
          height={120}
        >
          <path
            d="M10 8h8l4 4v12a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
            fill="none"
            stroke="#fafafa"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="18 8 18 12 22 12"
            fill="none"
            stroke="#fafafa"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="12" y1="16" x2="20" y2="16" stroke="#fafafa" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="12" y1="20" x2="17" y2="20" stroke="#fafafa" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
