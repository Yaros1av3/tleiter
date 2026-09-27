import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "TLight — Team Workspace";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

/*
 * Абсолютный URL до настоящего логотипа в /public.
 * ImageResponse (Satori) на edge runtime умеет подтягивать
 * картинки только по прямой ссылке — поэтому не relative path,
 * а полный адрес задеплоенного сайта.
 */
const LOGO_URL =
  "https://tlight-workspace.vercel.app/tlite-logo.png";

export default function TwitterImage() {
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
        }}
      >
        {/* TLight Logo */}
        <img
          src={LOGO_URL}
          width={200}
          height={200}
          style={{
            borderRadius: "44px",
            marginRight: "65px",
            boxShadow: "0 10px 40px rgba(17,24,32,0.18)",
          }}
        />

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
    },
  );
}