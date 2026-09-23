import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "TLight — Team Workspace";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "70px 90px",
          background: "#f7f8f9",
          color: "#111820",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {/* TLight Logo */}
        <div
          style={{
            width: "210px",
            height: "210px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "65px",
          }}
        >
          <svg
            width="190"
            height="190"
            viewBox="0 0 526 522"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Dark T shape */}
            <path
              d="
                M 63 98
                H 238

                C 275 98 302 126 302 162

                V 454

                C 302 483 283 455 248 455

                H 247

                C 217 455 194 437 194 408

                V 213

                H 115

                C 84 213 63 193 63 162

                Z
              "
              fill="#172431"
            />

            {/* Yellow part of the top bar */}
            <path
              d="
                M 238 98
                H 403

                C 434 98 455 119 455 151

                V 161

                C 455 193 434 213 403 213

                H 302

                V 162

                C 302 126 275 98 238 98

                Z
              "
              fill="#F6C84C"
            />
          </svg>
        </div>

        {/* Text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: "70px",
              fontWeight: 800,
              letterSpacing: "-3px",
              lineHeight: 1,
            }}
          >
            TLight
          </div>

          <div
            style={{
              marginTop: "22px",
              fontSize: "39px",
              fontWeight: 700,
              letterSpacing: "-1px",
            }}
          >
            Team Workspace
          </div>

          <div
            style={{
              marginTop: "18px",
              fontSize: "25px",
              color: "#737d87",
            }}
          >
            Dienst. Team. Ein Ort.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}