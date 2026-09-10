'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase' // パスは環境に合わせて調整してください

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    // ★ ここで Supabase のパスワード更新関数を実行します！
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setError('パスワードの変更に失敗しました: ' + error.message)
    } else {
      setMessage('パスワードを更新しました！')
      setNewPassword('')
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h2>パスワードの変更</h2>
      <form onSubmit={handlePasswordChange}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>新しいパスワード</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '10px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          {loading ? '更新中...' : 'パスワードを変更する'}
        </button>
      </form>
      {message && <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>}
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
    </div>
  )
}