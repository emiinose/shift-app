'use client'

import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

export default function Home() {
  const [session, setSession] = useState<any>(null)
  const [userRole, setUserRole] = useState<'admin' | 'employee'>('employee')

  // 認証用ステート
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [message, setMessage] = useState('')

  const presetSites = ['みなと', '佐川', 'ヨコレイ', '埠頭', '白鳥', 'Umios(コンテナ)', 'Umios(ピッキング)', 'ローソン', 'フリー']

  // 管理者タブ（overview: シフト管理, requests: 休み申請, staff: スタッフ一覧, detail: シフト詳細配置）
  const [adminTab, setAdminTab] = useState<'overview' | 'requests' | 'staff' | 'detail'>('overview')
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [customDebanInput, setCustomDebanInput] = useState('')

  const [shifts, setShifts] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [requirements, setRequirements] = useState<any[]>([])

  const [targetUserId, setTargetUserId] = useState('')
  const [startTime, setStartTime] = useState('08:30')
  const [endTime, setEndTime] = useState('17:00')

  // カレンダー用ステート（スタッフ用・管理者共通）
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedCalDate, setSelectedCalDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )

  // 休み申請用ステート
  const [leaveDate, setLeaveDate] = useState('')
  const [leaveSite, setLeaveSite] = useState(presetSites[0])
  const [leaveReason, setLeaveReason] = useState('')
  const [leaveRequests, setLeaveRequests] = useState<any[]>([])
  const [leaveMessage, setLeaveMessage] = useState('')

  // スタッフ編集モーダル用ステート
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [staffForm, setStaffForm] = useState({
    full_name: '',
    name_en: '',
    name_kana: '',
    registration_date: '',
    birth_date: '',
    address_city: '',
    visa_status: '',
  })
  const [staffSaveMsg, setStaffSaveMsg] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchUserProfile(session.user.id)
        loadAllData()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchUserProfile(session.user.id)
        loadAllData()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
    if (data) setUserRole(data.role as 'admin' | 'employee')
  }

  const loadAllData = async () => {
    const { data: shiftData } = await supabase.from('shifts').select('*')
    if (shiftData) setShifts(shiftData)

    const { data: profileData } = await supabase.from('profiles').select('*')
    if (profileData) setAllUsers(profileData)

    const { data: reqData } = await supabase.from('site_requirements').select('*')
    if (reqData) setRequirements(reqData)

    const { data: leaveData } = await supabase.from('leave_requests').select('*').order('created_at', { ascending: false })
    if (leaveData) setLeaveRequests(leaveData)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setMessage('メールアドレスとパスワードを入力してください')
      return
    }

    setMessage('ログイン処理中...')
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      })

      if (error) {
        setMessage(`ログインエラー: ${error.message}`)
      } else {
        setMessage('ログイン成功！')
      }
    } catch (err: any) {
      setMessage(`エラー: ${err.message || JSON.stringify(err)}`)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !email || !password) {
      setMessage('お名前、メールアドレス、パスワードを入力してください')
      return
    }

    setMessage('新規登録処理中...')
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: { full_name: fullName.trim() },
        },
      })

      if (error) {
        setMessage(`登録エラー: ${error.message}`)
      } else if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          role: 'employee',
          email: email.trim(),
          full_name: fullName.trim(),
        })
        setUserRole('employee')
        setMessage('新規登録が完了しました！ログイン中...')
      }
    } catch (err: any) {
      setMessage(`エラー: ${err.message || JSON.stringify(err)}`)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setMessage('メールアドレスを入力してください')
      return
    }

    setMessage('再設定メールを送信中...')

    // 💡 redirectTo オプションをあえて指定しない
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim())

    if (error) {
      setMessage(`送信エラー: ${error.message}`)
    } else {
      setMessage('パスワード再設定用メールを送信しました。受信トレイをご確認ください。')
    }
  }
  

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleOpenDetail = (dateStr: string, siteName: string) => {
    setSelectedDate(dateStr)
    setSelectedSite(siteName)
    setAdminTab('detail')
  }

  const handleUpdateRequirement = async (dateStr: string, siteName: string, newCount: number) => {
    const count = Math.max(0, newCount)
    const { error } = await supabase.from('site_requirements').upsert(
      { work_date: dateStr, site_name: siteName, required_count: count },
      { onConflict: 'work_date,site_name' }
    )

    if (!error) {
      setRequirements(prev => {
        const index = prev.findIndex(r => r.work_date === dateStr && r.site_name === siteName)
        if (index >= 0) {
          const copy = [...prev]
          copy[index].required_count = count
          return copy
        } else {
          return [...prev, { work_date: dateStr, site_name: siteName, required_count: count }]
        }
      })
    }
  }

  const handleAddCustomDeban = (dateStr: string) => {
    if (!customDebanInput.trim()) {
      alert('デバンの現場名または詳細を入力してください')
      return
    }
    const debanName = customDebanInput.startsWith('デバン') ? customDebanInput : `デバン（${customDebanInput}）`
    handleUpdateRequirement(dateStr, debanName, 1)
    setCustomDebanInput('')
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetUserId) {
      alert('スタッフを選択してください')
      return
    }

    const { error } = await supabase.from('shifts').insert([
      {
        site_name: selectedSite,
        user_id: targetUserId,
        work_date: selectedDate,
        start_time: startTime,
        end_time: endTime,
      },
    ])

    if (error) alert(`登録エラー: ${error.message}`)
    else {
      setTargetUserId('')
      loadAllData()
    }
  }

  const handleDeleteShift = async (id: string) => {
    if (!confirm('このスタッフをシフトから外しますか？')) return
    const { error } = await supabase.from('shifts').delete().eq('id', id)
    if (error) alert(`エラー: ${error.message}`)
    else loadAllData()
  }

  const handleSendLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leaveDate) {
      setLeaveMessage('日付を選択してください')
      return
    }

    const { error } = await supabase.from('leave_requests').insert([
      {
        user_id: session.user.id,
        user_email: session.user.email,
        leave_date: leaveDate,
        site_name: leaveSite,
        reason: leaveReason,
        status: 'pending',
      },
    ])

    if (error) {
      setLeaveMessage(`エラー: ${error.message}`)
    } else {
      setLeaveMessage('休み申請を送信しました！')
      setLeaveDate('')
      setLeaveReason('')
      loadAllData()
    }
  }

  const handleToggleLeaveStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'pending' ? 'approved' : 'pending'
    const { error } = await supabase.from('leave_requests').update({ status: nextStatus }).eq('id', id)

    if (!error) {
      loadAllData()
    } else {
      alert(`更新エラー: ${error.message}`)
    }
  }

  const handleOpenStaffModal = (user: any) => {
    setSelectedStaff(user)
    setStaffForm({
      full_name: user.full_name || '',
      name_en: user.name_en || '',
      name_kana: user.name_kana || '',
      registration_date: user.registration_date || '',
      birth_date: user.birth_date || '',
      address_city: user.address_city || '',
      visa_status: user.visa_status || '',
    })
    setStaffSaveMsg('')
  }

  const handleSaveStaffInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaff) return

    setStaffSaveMsg('保存中...')
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: staffForm.full_name,
        name_en: staffForm.name_en,
        name_kana: staffForm.name_kana,
        registration_date: staffForm.registration_date || null,
        birth_date: staffForm.birth_date || null,
        address_city: staffForm.address_city,
        visa_status: staffForm.visa_status,
      })
      .eq('id', selectedStaff.id)

    if (error) {
      setStaffSaveMsg(`エラー: ${error.message}`)
    } else {
      setStaffSaveMsg('保存しました！')
      loadAllData()
      setTimeout(() => {
        setSelectedStaff(null)
      }, 1000)
    }
  }

  const isJapaneseHoliday = (y: number, m: number, d: number) => {
    const monthDayHolidays: { [key: number]: number[] } = {
      1: [1],
      2: [11, 23],
      4: [29],
      5: [3, 4, 5],
      8: [11],
      11: [3, 23],
    }

    if (monthDayHolidays[m] && monthDayHolidays[m].includes(d)) return true

    const dateObj = new Date(y, m - 1, d)
    const dayOfWeek = dateObj.getDay()
    const nthWeek = Math.ceil(d / 7)

    if (dayOfWeek === 1) {
      if (m === 1 && nthWeek === 2) return true
      if (m === 7 && nthWeek === 3) return true
      if (m === 9 && nthWeek === 3) return true
      if (m === 10 && nthWeek === 2) return true
    }

    if (m === 3 && d === Math.floor(20.8431 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4))) return true
    if (m === 9 && d === Math.floor(23.2488 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4))) return true

    return false
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  const startDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const calendarDays = []
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month, day)
    const dayOfWeek = dateObj.getDay()
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isHoliday = isJapaneseHoliday(year, month + 1, day)

    calendarDays.push({ day, dateStr, dayOfWeek, isHoliday })
  }

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1))
  }

  const myShifts = shifts.filter(s => s.user_id === session?.user?.id)
  const selectedDayShifts = myShifts.filter(s => s.work_date === selectedCalDate)
  const myLeaveRequests = leaveRequests.filter(l => l.user_id === session?.user?.id)

  const pendingLeaveCount = leaveRequests.filter(r => r.status === 'pending').length

  if (session) {
    return (
      <div className="min-h-screen p-4 bg-gray-100 flex flex-col items-center">
        {/* ヘッダー */}
        <div className="w-full max-w-2xl bg-white p-4 rounded-lg shadow mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-base font-bold text-gray-800">シフト管理システム</h1>
            <span className={`text-xs px-2 py-0.5 rounded font-bold ${userRole === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
              {userRole === 'admin' ? '管理者モード' : 'スタッフモード'}
            </span>
          </div>
          <button onClick={handleSignOut} className="bg-red-500 text-white px-3 py-1 text-xs rounded hover:bg-red-600 font-bold">
            ログアウト
          </button>
        </div>

        {/* スタッフモード */}
        {userRole === 'employee' && (
          <div className="w-full max-w-md space-y-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm font-bold active:bg-gray-300">
                  &lt; 前月
                </button>
                <h2 className="text-base font-bold text-gray-800">
                  {year}年 {month + 1}月
                </h2>
                <button onClick={() => changeMonth(1)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm font-bold active:bg-gray-300">
                  次月 &gt;
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs mb-2">
                <div className="text-red-500">日</div>
                <div className="text-gray-500">月</div>
                <div className="text-gray-500">火</div>
                <div className="text-gray-500">水</div>
                <div className="text-gray-500">木</div>
                <div className="text-gray-500">金</div>
                <div className="text-blue-500">土</div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((item, idx) => {
                  if (!item) return <div key={`empty-${idx}`} className="h-12 bg-gray-50 rounded-lg"></div>

                  const hasShift = myShifts.some(s => s.work_date === item.dateStr)
                  const isSelected = selectedCalDate === item.dateStr

                  let textColor = 'text-gray-700'
                  if (item.dayOfWeek === 0 || item.isHoliday) {
                    textColor = 'text-red-500 font-extrabold'
                  } else if (item.dayOfWeek === 6) {
                    textColor = 'text-blue-500 font-extrabold'
                  }

                  return (
                    <button
                      key={item.dateStr}
                      onClick={() => setSelectedCalDate(item.dateStr)}
                      className={`h-12 flex flex-col items-center justify-between p-1 rounded-lg border text-xs transition ${
                        isSelected ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-400' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <span className={`font-bold ${textColor}`}>{item.day}</span>
                      {hasShift && <span className="w-2 h-2 rounded-full bg-blue-600 mb-1"></span>}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow space-y-3">
              <h3 className="text-sm font-bold text-gray-700 border-b pb-2">
                📅 {selectedCalDate} のスケジュール
              </h3>

              {selectedDayShifts.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">予定されているシフトはありません</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayShifts.map(s => (
                    <div key={s.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center text-gray-800">
                      <div>
                        <span className="text-xs text-gray-500 block">勤務現場</span>
                        <span className="text-sm font-bold text-blue-900">{s.site_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block">勤務時間</span>
                        <span className="text-sm font-bold text-gray-800">
                          {s.start_time.slice(0, 5)} ～ {s.end_time.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-4 rounded-lg shadow space-y-4">
              <h3 className="text-sm font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                ✉️ 休み申請フォーマット
              </h3>

              <form onSubmit={handleSendLeaveRequest} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">名前（メールアドレス）</label>
                  <input
                    type="text"
                    disabled
                    value={session.user.email}
                    className="w-full p-2 border rounded text-xs bg-gray-100 text-gray-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">希望日付 *</label>
                  <input
                    type="date"
                    required
                    value={leaveDate}
                    onChange={(e) => setLeaveDate(e.target.value)}
                    className="w-full p-2 border rounded text-xs text-gray-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">対象現場</label>
                  <select
                    value={leaveSite}
                    onChange={(e) => setLeaveSite(e.target.value)}
                    className="w-full p-2 border rounded text-xs text-gray-800 focus:ring-2 focus:ring-blue-500"
                  >
                    {presetSites.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">メッセージ / 理由</label>
                  <textarea
                    rows={2}
                    placeholder="理由などを記載（任意）"
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    className="w-full p-2 border rounded text-xs text-gray-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded text-xs shadow transition"
                >
                  送信する
                </button>

                {leaveMessage && (
                  <p className="text-xs text-center font-bold text-green-600 mt-2">{leaveMessage}</p>
                )}
              </form>

              {myLeaveRequests.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-xs font-bold text-gray-700 mb-2">送信済みの申請履歴</h4>
                  <div className="space-y-2">
                    {myLeaveRequests.map(r => (
                      <div key={r.id} className="p-2 border rounded bg-gray-50 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-gray-800">{r.leave_date}</span> ({r.site_name})
                        </div>
                        <span className={`px-2 py-0.5 rounded font-bold ${r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {r.status === 'approved' ? '許可済み' : '確認中'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 管理者モード */}
        {userRole === 'admin' && (
          <div className="w-full max-w-2xl space-y-4">
            {/* ナビゲーションタブ (3つに拡張) */}
            <div className="flex border-b border-gray-200 bg-white rounded-t-lg overflow-hidden shadow-sm">
              <button
                onClick={() => setAdminTab('overview')}
                className={`flex-1 py-3 text-xs font-bold border-b-2 text-center transition ${
                  adminTab === 'overview' || adminTab === 'detail'
                    ? 'border-purple-600 text-purple-600 bg-purple-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📅 シフト管理
              </button>
              <button
                onClick={() => setAdminTab('requests')}
                className={`flex-1 py-3 text-xs font-bold border-b-2 text-center transition relative ${
                  adminTab === 'requests'
                    ? 'border-purple-600 text-purple-600 bg-purple-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📩 休み申請一覧
                {pendingLeaveCount > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                    {pendingLeaveCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setAdminTab('staff')}
                className={`flex-1 py-3 text-xs font-bold border-b-2 text-center transition ${
                  adminTab === 'staff'
                    ? 'border-purple-600 text-purple-600 bg-purple-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                👥 スタッフ一覧・詳細
              </button>
            </div>

            {/* Tab 1: シフト管理 (カレンダー + 過去・未来シフト閲覧) */}
            {(adminTab === 'overview' || adminTab === 'detail') && (
              <div className="space-y-4">
                {/* カレンダー設置（過去の日付も自由に選択可能） */}
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="flex justify-between items-center mb-4">
                    <button onClick={() => changeMonth(-1)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-bold hover:bg-gray-300">
                      &lt; 前月
                    </button>
                    <h2 className="text-sm font-bold text-gray-800">
                      日付選択: {year}年 {month + 1}月
                    </h2>
                    <button onClick={() => changeMonth(1)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-bold hover:bg-gray-300">
                      次月 &gt;
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs mb-2">
                    <div className="text-red-500">日</div>
                    <div className="text-gray-500">月</div>
                    <div className="text-gray-500">火</div>
                    <div className="text-gray-500">水</div>
                    <div className="text-gray-500">木</div>
                    <div className="text-gray-500">金</div>
                    <div className="text-blue-500">土</div>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((item, idx) => {
                      if (!item) return <div key={`admin-empty-${idx}`} className="h-10 bg-gray-50 rounded"></div>

                      const isSelected = selectedDate === item.dateStr
                      const hasShiftData = shifts.some(s => s.work_date === item.dateStr)

                      let textColor = 'text-gray-700'
                      if (item.dayOfWeek === 0 || item.isHoliday) {
                        textColor = 'text-red-500 font-bold'
                      } else if (item.dayOfWeek === 6) {
                        textColor = 'text-blue-500 font-bold'
                      }

                      return (
                        <button
                          key={`admin-${item.dateStr}`}
                          onClick={() => {
                            setSelectedDate(item.dateStr)
                            if (adminTab === 'detail') setAdminTab('overview')
                          }}
                          className={`h-10 flex flex-col items-center justify-between p-1 rounded border text-xs transition ${
                            isSelected
                              ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-400 font-bold'
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          }`}
                        >
                          <span className={textColor}>{item.day}</span>
                          {hasShiftData && <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mb-0.5"></span>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* View 1-A: 選択した日付のシフト一覧確認 */}
                {adminTab === 'overview' && (
                  <div className="bg-white p-6 rounded-lg shadow space-y-6">
                    <div className="border-b pb-2 flex justify-between items-center">
                      <h2 className="text-md font-bold text-purple-900">
                        📅 {selectedDate} のシフト状況
                      </h2>
                      <span className="text-xs text-gray-500">※数字変更で即座更新</span>
                    </div>

                    {(() => {
                      const customDebanSites = Array.from(new Set([
                        ...requirements.filter(r => r.work_date === selectedDate && r.site_name.includes('デバン')).map(r => r.site_name),
                        ...shifts.filter(s => s.work_date === selectedDate && s.site_name.includes('デバン')).map(s => s.site_name)
                      ]))

                      const currentSites = [...presetSites, ...customDebanSites]

                      return (
                        <div className="space-y-2">
                          {currentSites.map(site => {
                            const assignedCount = shifts.filter(s => s.work_date === selectedDate && s.site_name === site).length
                            const req = requirements.find(r => r.work_date === selectedDate && r.site_name === site)
                            const reqTotal = req ? req.required_count : (site.includes('デバン') ? 1 : 3)
                            const remaining = reqTotal - assignedCount

                            return (
                              <div
                                key={site}
                                className="flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 border rounded transition"
                              >
                                <button
                                  onClick={() => handleOpenDetail(selectedDate, site)}
                                  className="font-bold text-gray-800 hover:text-purple-600 text-left underline text-xs"
                                >
                                  {site} ({assignedCount}名配置済)
                                </button>

                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <span>必要:</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={reqTotal}
                                      onChange={(e) => handleUpdateRequirement(selectedDate, site, Number(e.target.value))}
                                      className="w-12 p-1 border rounded text-center text-gray-800 font-bold bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                    <span>人</span>
                                  </div>

                                  <span
                                    onClick={() => handleOpenDetail(selectedDate, site)}
                                    className={`text-xs font-bold cursor-pointer ${remaining <= 0 ? 'text-green-600' : 'text-orange-600'}`}
                                  >
                                    {remaining <= 0 ? '充足' : `あと ${remaining} 人`}
                                  </span>
                                </div>
                              </div>
                            )
                          })}

                          <div className="flex items-center gap-2 pt-3">
                            <input
                              type="text"
                              placeholder="デバンの現場名・手動入力（例: デバンA）"
                              value={customDebanInput}
                              onChange={(e) => setCustomDebanInput(e.target.value)}
                              className="flex-1 p-2 border rounded text-xs text-gray-800"
                            />
                            <button
                              onClick={() => handleAddCustomDeban(selectedDate)}
                              className="bg-purple-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-purple-700"
                            >
                              デバン追加
                            </button>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* View 1-B: シフト詳細配置画面 */}
                {adminTab === 'detail' && (
                  <div className="bg-white p-6 rounded-lg shadow space-y-6">
                    <div className="flex items-center gap-4 border-b pb-3">
                      <button
                        onClick={() => setAdminTab('overview')}
                        className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded hover:bg-gray-300"
                      >
                        &lt; 戻る
                      </button>
                      <h2 className="text-md font-bold text-gray-800">
                        {selectedDate} 【{selectedSite}】
                      </h2>
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-700 text-xs mb-2">配置スタッフ一覧</h3>
                      {shifts.filter(s => s.work_date === selectedDate && s.site_name === selectedSite).length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">配置されたスタッフはいません</p>
                      ) : (
                        <div className="space-y-2">
                          {shifts.filter(s => s.work_date === selectedDate && s.site_name === selectedSite).map(s => {
                            const user = allUsers.find(u => u.id === s.user_id)
                            return (
                              <div key={s.id} className="flex justify-between items-center p-3 border rounded bg-white text-xs">
                                <span className="font-bold text-gray-800">{user?.full_name ? `${user.full_name} (${user.email})` : (user?.email || s.user_id)}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-gray-500">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</span>
                                  <button
                                    onClick={() => handleDeleteShift(s.id)}
                                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 font-bold"
                                  >
                                    削除
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleAddStaff} className="border-t pt-4 space-y-3">
                      <h3 className="font-bold text-gray-700 text-xs">スタッフを追加</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <select
                          value={targetUserId}
                          onChange={(e) => setTargetUserId(e.target.value)}
                          className="p-2 border rounded text-gray-800 text-xs"
                        >
                          <option value="">スタッフを選択...</option>
                          {allUsers.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.full_name ? `${u.full_name} (${u.email})` : u.email}
                            </option>
                          ))}
                        </select>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="p-2 border rounded text-gray-800 text-xs"
                        />
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="p-2 border rounded text-gray-800 text-xs"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 text-xs shadow"
                      >
                        この現場に追加する
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: 独立した「届いた休み申請一覧」 */}
            {adminTab === 'requests' && (
              <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <h2 className="text-md font-bold text-gray-800 border-b pb-2 flex items-center justify-between">
                  <span>📩 届いた休み申請一覧</span>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                    未処理: {pendingLeaveCount}件
                  </span>
                </h2>

                {leaveRequests.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">休み申請はありません</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 border-b">
                          <th className="p-2">スタッフ</th>
                          <th className="p-2">希望日</th>
                          <th className="p-2">現場名</th>
                          <th className="p-2">メッセージ</th>
                          <th className="p-2 text-center">状態</th>
                          <th className="p-2 text-center">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveRequests.map(req => (
                          <tr key={req.id} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-bold text-gray-800">{req.user_email}</td>
                            <td className="p-2 font-bold text-blue-600">{req.leave_date}</td>
                            <td className="p-2 text-gray-700">{req.site_name}</td>
                            <td className="p-2 text-gray-500">{req.reason || '-'}</td>
                            <td className="p-2 text-center">
                              <span className={`px-2 py-0.5 rounded font-bold ${req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {req.status === 'approved' ? '許可済み' : '未許可'}
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => handleToggleLeaveStatus(req.id, req.status)}
                                className={`px-3 py-1 rounded text-xs font-bold transition ${
                                  req.status === 'approved'
                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                              >
                                {req.status === 'approved' ? '未許可に戻す' : '許可する'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: スタッフ一覧・詳細機能 */}
            {adminTab === 'staff' && (
              <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                  <h2 className="text-lg font-bold text-gray-800">👥 スタッフ一覧</h2>
                  <span className="text-xs text-gray-500">名前カードをタップして詳細編集</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allUsers.map(u => (
                    <div
                      key={u.id}
                      onClick={() => handleOpenStaffModal(u)}
                      className="p-4 border rounded-xl bg-gray-50 hover:bg-purple-50 hover:border-purple-300 transition cursor-pointer flex justify-between items-center shadow-sm"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800 text-sm">{u.full_name || '名称未設定'}</span>
                          {u.role === 'admin' && (
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">管理者</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                        {u.visa_status && (
                          <span className="inline-block mt-2 text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-bold">
                            {u.visa_status}
                          </span>
                        )}
                      </div>
                      <span className="text-purple-600 text-xs font-bold">編集 &gt;</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* スタッフ詳細・編集 モーダル */}
        {selectedStaff && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-gray-800 text-base">スタッフ詳細・情報編集</h3>
                <button
                  onClick={() => setSelectedStaff(null)}
                  className="text-gray-400 hover:text-gray-600 font-bold text-lg px-2"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveStaffInfo} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">メールアドレス（変更不可）</label>
                  <input
                    type="text"
                    disabled
                    value={selectedStaff.email}
                    className="w-full p-2 border rounded bg-gray-100 text-gray-500 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">名前（漢字・表示名）</label>
                    <input
                      type="text"
                      value={staffForm.full_name}
                      onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                      className="w-full p-2 border rounded text-gray-800 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">名前（フリガナ）</label>
                    <input
                      type="text"
                      placeholder="ヤマダ タロウ"
                      value={staffForm.name_kana}
                      onChange={(e) => setStaffForm({ ...staffForm, name_kana: e.target.value })}
                      className="w-full p-2 border rounded text-gray-800 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">名前（英語・ローマ字）</label>
                  <input
                    type="text"
                    placeholder="Taro Yamada"
                    value={staffForm.name_en}
                    onChange={(e) => setStaffForm({ ...staffForm, name_en: e.target.value })}
                    className="w-full p-2 border rounded text-gray-800 focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">登録日</label>
                    <input
                      type="date"
                      value={staffForm.registration_date}
                      onChange={(e) => setStaffForm({ ...staffForm, registration_date: e.target.value })}
                      className="w-full p-2 border rounded text-gray-800 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">生年月日</label>
                    <input
                      type="date"
                      value={staffForm.birth_date}
                      onChange={(e) => setStaffForm({ ...staffForm, birth_date: e.target.value })}
                      className="w-full p-2 border rounded text-gray-800 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">住所（区・市のみ）</label>
                  <input
                    type="text"
                    placeholder="名古屋市港区"
                    value={staffForm.address_city}
                    onChange={(e) => setStaffForm({ ...staffForm, address_city: e.target.value })}
                    className="w-full p-2 border rounded text-gray-800 focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">在留資格</label>
                  <input
                    type="text"
                    placeholder="永住者 / 永住者の配偶者等 / 留学 など"
                    value={staffForm.visa_status}
                    onChange={(e) => setStaffForm({ ...staffForm, visa_status: e.target.value })}
                    className="w-full p-2 border rounded text-gray-800 focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStaff(null)}
                    className="flex-1 py-2 bg-gray-200 text-gray-700 rounded font-bold hover:bg-gray-300"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700 shadow"
                  >
                    保存する
                  </button>
                </div>

                {staffSaveMsg && (
                  <p className="text-center font-bold text-purple-600 mt-2">{staffSaveMsg}</p>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ログイン / 新規登録 / パスワードリセット 画面
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow-md space-y-5">
        <h1 className="text-xl font-bold text-center text-gray-800">
          {authMode === 'login' && 'ログイン'}
          {authMode === 'signup' && '新規アカウント登録'}
          {authMode === 'reset' && 'パスワードの再設定'}
        </h1>

        {authMode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">メールアドレス</label>
              <input
                type="email"
                required
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">パスワード</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 pr-12 border rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.858A9.954 9.954 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-4.592-4.592a3 3 0 11-4.243-4.243" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-1.5 text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                ログイン状態を保持
              </label>
              <button
                type="button"
                onClick={() => {
                  setMessage('')
                  setAuthMode('reset')
                }}
                className="text-blue-600 hover:underline font-bold"
              >
                パスワードをお忘れの方
              </button>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-sm shadow transition"
            >
              ログイン
            </button>

            <div className="border-t pt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setMessage('')
                  setAuthMode('signup')
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg text-sm shadow transition"
              >
                新規登録はこちら
              </button>
            </div>
          </form>
        )}

        {authMode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">お名前（氏名） *</label>
              <input
                type="text"
                required
                placeholder="山田 太郎"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 border rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">メールアドレス *</label>
              <input
                type="email"
                required
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">パスワード *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="6文字以上のパスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 pr-12 border rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.858A9.954 9.954 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-4.592-4.592a3 3 0 11-4.243-4.243" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg text-sm shadow transition"
            >
              アカウントを作成する
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMessage('')
                  setAuthMode('login')
                }}
                className="text-xs text-blue-600 hover:underline font-bold"
              >
                &lt; ログイン画面に戻る
              </button>
            </div>
          </form>
        )}

        {authMode === 'reset' && (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <p className="text-xs text-gray-600">
              ご登録のメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">メールアドレス</label>
              <input
                type="email"
                required
                placeholder="example@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-sm shadow transition"
            >
              再設定メールを送信
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMessage('')
                  setAuthMode('login')
                }}
                className="text-xs text-blue-600 hover:underline font-bold"
              >
                &lt; ログイン画面に戻る
              </button>
            </div>
          </form>
        )}

        {message && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-gray-800 font-bold text-center break-all">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}