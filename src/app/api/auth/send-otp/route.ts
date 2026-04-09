// src/app/api/auth/send-otp/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

// 🌟 [Whitelist] 여기에 클로즈 베타를 허용할 이메일을 적습니다.
// (참고: Resend 무료 샌드박스에서는 본인 가입 이메일로만 발송 가능합니다)
const WHITELIST = [
  "deltahotel93@gmail.com", // 본인 이메일로 수정해주세요!
  "lemonsoda0807@naver.com",
];

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!WHITELIST.includes(email)) {
      return NextResponse.json({ error: "Access Denied: 등록되지 않은 이메일입니다." }, { status: 403 });
    }

    // 1. 6자리 OTP 생성
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 2. 만료 시간 설정 (3분)
    const expiresAt = Date.now() + 3 * 60 * 1000; 

    // 3. 서버 비밀키로 해시(Hash) 암호문 생성 (무상태 인증의 핵심!)
    const data = `${email}.${otp}.${expiresAt}`;
    const hash = crypto.createHmac("sha256", process.env.OTP_SECRET!).update(data).digest("hex");

    // 4. 이메일 발송
    await resend.emails.send({
      from: "Admin <onboarding@resend.dev>",
      to: email,
      subject: "[POS ERP] 클로즈 베타 접속 인증번호",
      html: `
        <div style="padding: 20px; border-radius: 10px; background-color: #f3f4f6; text-align: center;">
          <h2 style="color: #4b5563;">클로즈 베타 인증번호</h2>
          <p style="font-size: 16px; color: #6b7280;">아래 6자리 숫자를 3분 안에 입력해주세요.</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #8b5cf6; margin: 20px 0;">${otp}</div>
        </div>
      `,
    });

    // 5. DB에 저장하지 않고 클라이언트에게 해시와 만료시간만 넘겨줌
    return NextResponse.json({ hash, expiresAt });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: "이메일 발송에 실패했습니다." }, { status: 500 });
  }
}