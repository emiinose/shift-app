'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // メール内のリンクからアクセスされた（Recoveryセッションが存在する）かの判定
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && window.location.hash.includes('type=recovery'))) {
      setIsRecoveryMode(true)
    }
  })
  // ② URLパラメータまたはセッションの直接チェック
  const checkRecovery = async () => {
    const hash = window.location.hash
    // メールリンクからの遷移でURLハッシュに recovery が含まれているか確認
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      setIsRecoveryMode(true)
      return
    }

    // 既にセッションが復元されているかチェック
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      setIsRecoveryMode(true)
    }
  }

  checkRecovery()

  return () => {
    subscription.unsubscribe()
  }
}, [])

  // ① 再設定メールの送信処理
  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    try {
      // リダイレクト先には window.location.origin を使用して正確な絶対パスを組み立てる
      const redirectUrl = `${window.location.origin}/reset-password`

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      if (resetError) throw resetError

      setMessage('パスワード再設定用のメールを送信しました。メールボックスをご確認ください。')
    } catch (err: any) {
      setError(err.message || 'メールの送信に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  // ② 新しいパスワードの更新処理
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) throw updateError

      setMessage('パスワードが正常に更新されました。ログイン画面に移動します...')
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'パスワードの更新に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>パスワードの再設定</h2>

      {message && <p style={{ color: 'green', fontSize: '14px' }}>{message}</p>}
      {error && <p style={{ color: 'red', fontSize: '14px' }}>送信エラー: {error}</p>}

      {!isRecoveryMode ? (
        // メールアドレス入力・送信フォーム
        <form onSubmit={handleSendResetEmail}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              placeholder="example@example.com"
            />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', cursor: 'pointer' }}>
            {loading ? '送信中...' : '再設定メールを送信'}
          </button>
        </form>
      ) : (
        // 新パスワード入力フォーム
        <form onSubmit={handleUpdatePassword}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>新しいパスワード</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              placeholder="6文字以上で入力"
            />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', cursor: 'pointer' }}>
            {loading ? '更新中...' : '新しいパスワードを保存'}
          </button>
        </form>
      )}

      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <a href="/" style={{ color: '#0066cc', textDecoration: 'none' }}>&lt; ログイン画面に戻る</a>
      </div>
    </div>
  )
}