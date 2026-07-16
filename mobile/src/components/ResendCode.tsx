// A "Resend code" control with a cooldown countdown that matches the backend's 60s
// resend window (RESEND_COOLDOWN_MS). Re-issues the code via the caller's onResend,
// and shows the server's localized 429 message (cooldown / too-many-requests /
// rate-limited) inline. Mounts → starts the countdown, so render it only once a code
// has been sent (e.g. inside the OTP phase).
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { colors } from "../theme";
import { ApiError } from "../api/client";

const COOLDOWN = 60; // seconds — keep in sync with backend RESEND_COOLDOWN_MS

export function ResendCode({ onResend }: { onResend: () => Promise<unknown> }) {
  const { t } = useTranslation();
  const [left, setLeft] = useState(COOLDOWN);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [isErr, setIsErr] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = (secs = COOLDOWN) => {
    if (timer.current) clearInterval(timer.current);
    setLeft(secs);
    timer.current = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) { if (timer.current) clearInterval(timer.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    start();
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const onPress = async () => {
    if (left > 0 || sending) return;
    setSending(true); setMsg(""); setIsErr(false);
    try {
      await onResend();
      setMsg(t("auth.codeResent")); setIsErr(false);
      start();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : t("auth.genericError"));
      setIsErr(true);
      // If the server says we're still in cooldown / rate-limited, keep the button parked.
      if (e instanceof ApiError && (e.code === "OTP_RESEND_COOLDOWN" || e.code === "RATE_LIMITED")) start();
    } finally {
      setSending(false);
    }
  };

  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <View style={styles.wrap}>
      {sending ? (
        <ActivityIndicator color={colors.primary} />
      ) : left > 0 ? (
        <Text style={styles.waiting}>{t("auth.resendIn", { time: mmss })}</Text>
      ) : (
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.link}>{t("auth.resendCode")}</Text>
        </TouchableOpacity>
      )}
      {msg ? <Text style={[styles.note, isErr && styles.noteErr]}>{msg}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", marginTop: 16 },
  waiting: { fontSize: 14, color: colors.textSecondary },
  link: { fontSize: 14, color: colors.primary, fontWeight: "600" },
  note: { fontSize: 13, color: colors.textSecondary, textAlign: "center", marginTop: 8 },
  noteErr: { color: colors.error },
});