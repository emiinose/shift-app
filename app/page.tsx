'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation' 
import { supabase } from './lib/supabase'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()
  const [session, setSession] = useState<any>(null)
  const [userRole, setUserRole] = useState<'admin' | 'employee'>('employee')
  const [userProfile, setUserProfile] = useState<any>(null)

  // 認証用ステート
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  // プリセット現場名
  const presetSites = ['みなと', '佐川', 'ヨコレイ', '埠頭', '白鳥', 'Umios(コンテナ)', 'Umios(ピッキング)']

  // 管理者タブ
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
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('17:00')

  // カレンダー用ステート
  const [currentDate, setCurrentDate] = useState(new Date())
  const [slideDirection, setSlideDirection] = useState<number>(0) // 1: 次月(左へスライド), -1: 前月(右へスライド)

  // 休み申請用ステート
  const [leaveRequests, setLeaveRequests] = useState<any[]>([])

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
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      router.push('/reset-password' + window.location.hash)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchUserProfile(session.user.id)
        loadAllData()
      }
    })
  }, [router])

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) {
      setUserProfile(data)
      setUserRole(data.role as 'admin' | 'employee')
    }
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
        window.location.href = '/'
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
        setMessage('新規登録が完了しました！移動します...')
        window.location.href = '/'
      }
    } catch (err: any) {
      setMessage(`エラー: ${err.message || JSON.stringify(err)}`)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
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
      alert('現場名を入力してください')
      return
    }
    const debanName = customDebanInput.trim()
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

  // 月切り替え関数
  const changeMonth = (offset: number) => {
    setSlideDirection(offset)
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1))
  }

  // 月曜始まりのカレンダー生成計算
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  let startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7
  const daysInMonth = lastDayOfMonth.getDate()

  const prevMonthLastDay = new Date(year, month, 0).getDate()

  const calendarDays = []
  
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i
    const prevDateObj = new Date(year, month - 1, day)
    const y = prevDateObj.getFullYear()
    const m = prevDateObj.getMonth() + 1
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    calendarDays.push({ day, dateStr, isCurrentMonth: false, dayOfWeek: (prevDateObj.getDay() + 6) % 7 })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month, day)
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    calendarDays.push({ day, dateStr, isCurrentMonth: true, dayOfWeek: (dateObj.getDay() + 6) % 7 })
  }

  const remainingCells = (7 - (calendarDays.length % 7)) % 7
  for (let day = 1; day <= remainingCells; day++) {
    const nextDateObj = new Date(year, month + 1, day)
    const y = nextDateObj.getFullYear()
    const m = nextDateObj.getMonth() + 1
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    calendarDays.push({ day, dateStr, isCurrentMonth: false, dayOfWeek: (nextDateObj.getDay() + 6) % 7 })
  }

  const pendingLeaveCount = leaveRequests.filter(r => r.status === 'pending').length

  // アニメーション設定
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  }

  if (session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center pb-20">
        <div className="w-full max-w-[430px] bg-white min-h-screen shadow-md flex flex-col overflow-hidden">
          
          {/* ヘッダー */}
          <div className="bg-[#4B8BF5] text-white p-4 pt-6 flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{year}年{month + 1}月</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold">
                {userRole === 'admin' ? '管理者' : 'スタッフ'}
              </span>
              <button onClick={handleSignOut} className="text-xs text-white/80 hover:text-white underline">
                ログアウト
              </button>
            </div>
          </div>

          {/* カレンダーヘッダー */}
          <div className="grid grid-cols-7 text-center text-xs font-semibold bg-[#EBE8E1] text-gray-700 py-1.5 border-b border-gray-300">
            <div>月</div>
            <div>火</div>
            <div>水</div>
            <div>木</div>
            <div>金</div>
            <div className="text-[#4B8BF5]">土</div>
            <div className="text-red-500">日</div>
          </div>

          {/* スライド付きカレンダーエリア */}
<div className="relative overflow-hidden border-b border-gray-200 h-[288px] touch-pan-y">
  <AnimatePresence initial={false} custom={slideDirection} mode="popLayout">
    <motion.div
      key={`${year}-${month}`}
      custom={slideDirection}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.15 }
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={(e, { offset, velocity }) => {
        const swipe = Math.abs(offset.x) * velocity.x
        if (offset.x < -60 || swipe < -400) {
          changeMonth(1) // 左スワイプで翌月へ
        } else if (offset.x > 60 || swipe > 400) {
          changeMonth(-1) // 右スワイプで前月へ
        }
      }}
      className="grid grid-cols-7 w-full absolute top-0 left-0 cursor-grab active:cursor-grabbing select-none"
    >
      {calendarDays.map((item, idx) => {
        const isSelected = selectedDate === item.dateStr
        let textColor = item.isCurrentMonth ? 'text-gray-800' : 'text-gray-400'
        if (item.isCurrentMonth) {
          if (item.dayOfWeek === 5) textColor = 'text-[#4B8BF5]'
          if (item.dayOfWeek === 6) textColor = 'text-red-500'
        }

        return (
          <button
            key={idx}
            onClick={() => {
              setSelectedDate(item.dateStr)
              if (adminTab === 'detail') setAdminTab('overview')
            }}
            className="h-12 border-r border-b border-gray-200 flex flex-col items-center justify-start pt-1.5 relative hover:bg-gray-50 transition"
          >
            <span className={`text-xs font-medium leading-none w-6 h-6 flex items-center justify-center ${
              isSelected ? 'bg-[#4B8BF5] text-white rounded-full font-bold' : textColor
            }`}>
              {item.day}
            </span>
          </button>
        )
      })}
    </motion.div>
  </AnimatePresence>
</div>

          {/* メインコンテンツエリア */}
          <div className="p-4 flex-1">
            {(adminTab === 'overview' || adminTab === 'detail') && (
              <div>
                <div className="text-sm font-bold text-gray-800 mb-3">
                  {selectedDate.replace(/-/g, '/')}
                </div>

                {adminTab === 'overview' && (
                  <div className="space-y-3">
                    {(() => {
                      const customDebanSites = Array.from(new Set([
                        ...requirements.filter(r => r.work_date === selectedDate && !presetSites.includes(r.site_name)).map(r => r.site_name),
                        ...shifts.filter(s => s.work_date === selectedDate && !presetSites.includes(s.site_name)).map(s => s.site_name)
                      ]))

                      const currentSites = [...presetSites, ...customDebanSites]

                      return (
                        <>
                          <div className="space-y-2.5">
                            {currentSites.map(site => {
                              const assignedCount = shifts.filter(s => s.work_date === selectedDate && s.site_name === site).length
                              const req = requirements.find(r => r.work_date === selectedDate && r.site_name === site)
                              const reqTotal = req ? req.required_count : (site.includes('デバン') ? 1 : 0)
                              const remaining = reqTotal - assignedCount

                              return (
                                <div key={site} className="flex items-center justify-between text-xs py-1">
                                  <span 
                                    onClick={() => handleOpenDetail(selectedDate, site)}
                                    className="font-bold text-gray-800 cursor-pointer hover:text-[#4B8BF5] flex-1"
                                  >
                                    {site}
                                  </span>

                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1 text-gray-600">
                                      <span>必要：</span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={reqTotal}
                                        onChange={(e) => handleUpdateRequirement(selectedDate, site, Number(e.target.value))}
                                        className="w-10 h-7 border-2 border-[#4B8BF5] rounded text-center font-bold text-gray-800 focus:outline-none"
                                      />
                                      <span>人</span>
                                    </div>

                                    <div 
                                      onClick={() => handleOpenDetail(selectedDate, site)}
                                      className="flex items-center gap-1 cursor-pointer w-20 justify-end"
                                    >
                                      <span className={`font-bold ${remaining > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                        残り {Math.max(0, remaining)} 人
                                      </span>
                                      <span className="text-[#4B8BF5] font-bold">&gt;</span>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          <div className="flex items-center gap-2 pt-4 border-t border-gray-100 mt-4">
                            <input
                              type="text"
                              placeholder="現場名"
                              value={customDebanInput}
                              onChange={(e) => setCustomDebanInput(e.target.value)}
                              className="flex-1 p-2 border-2 border-[#4B8BF5] rounded text-xs text-gray-800 focus:outline-none"
                            />
                            <button
                              onClick={() => handleAddCustomDeban(selectedDate)}
                              className="bg-[#4B8BF5] text-white px-4 py-2 rounded text-xs font-bold hover:bg-[#3B72D0] transition"
                            >
                              追加
                            </button>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}

                {adminTab === 'detail' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <button
                        onClick={() => setAdminTab('overview')}
                        className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded font-bold"
                      >
                        &lt; 戻る
                      </button>
                      <span className="font-bold text-sm text-[#4B8BF5]">{selectedSite}</span>
                    </div>

                    <div>
                      <h3 className="font-bold text-gray-700 text-xs mb-2">配置スタッフ一覧</h3>
                      {shifts.filter(s => s.work_date === selectedDate && s.site_name === selectedSite).length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">配置されたスタッフはいません</p>
                      ) : (
                        <div className="space-y-2">
                          {shifts.filter(s => s.work_date === selectedDate && s.site_name === selectedSite).map(s => {
                            const user = allUsers.find(u => u.id === s.user_id)
                            const displayName = user?.full_name ? `${user.full_name}` : (user?.email || s.user_id)
                            return (
                              <div key={s.id} className="flex justify-between items-center p-2.5 border rounded text-xs bg-gray-50">
                                <span className="font-bold text-gray-800">{displayName}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</span>
                                  <button
                                    onClick={() => handleDeleteShift(s.id)}
                                    className="px-2 py-0.5 bg-red-500 text-white rounded text-[10px] font-bold"
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
                      <select
                        value={targetUserId}
                        onChange={(e) => setTargetUserId(e.target.value)}
                        className="w-full p-2 border rounded text-gray-800 text-xs bg-white"
                      >
                        <option value="">スタッフを選択...</option>
                        {allUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.full_name ? `${u.full_name} (${u.email || ''})` : u.email}
                          </option>
                        ))}
                      </select>

                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="flex-1 p-2 border rounded text-gray-800 text-xs"
                        />
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="flex-1 p-2 border rounded text-gray-800 text-xs"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-[#4B8BF5] text-white py-2 rounded font-bold hover:bg-[#3B72D0] text-xs shadow transition"
                      >
                        追加する
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {adminTab === 'staff' && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-gray-800 mb-2">👥 スタッフ一覧</h2>
                <div className="space-y-2">
                  {allUsers.map(u => (
                    <div
                      key={u.id}
                      onClick={() => handleOpenStaffModal(u)}
                      className="p-3 border rounded-lg bg-gray-50 hover:bg-blue-50 transition cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <div className="font-bold text-gray-800 text-xs">{u.full_name || '名称未設定'}</div>
                        <div className="text-[10px] text-gray-500">{u.email || 'メール未設定'}</div>
                      </div>
                      <span className="text-[#4B8BF5] text-xs font-bold">&gt;</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {adminTab === 'requests' && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-gray-800 mb-2">📩 休み申請一覧</h2>
                {leaveRequests.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">休み申請はありません</p>
                ) : (
                  <div className="space-y-2">
                    {leaveRequests.map(req => {
                      const applicant = allUsers.find(u => u.id === req.user_id)
                      return (
                        <div key={req.id} className="p-3 border rounded-lg text-xs space-y-1 bg-gray-50">
                          <div className="flex justify-between font-bold">
                            <span>{applicant?.full_name || req.user_email || '不明'}</span>
                            <span className="text-red-500">{req.leave_date}</span>
                          </div>
                          <div className="text-gray-600">現場: {req.site_name}</div>
                          {req.reason && <div className="text-gray-500 text-[11px]">理由: {req.reason}</div>}
                          <div className="pt-2 flex justify-end">
                            <button
                              onClick={() => handleToggleLeaveStatus(req.id, req.status)}
                              className={`px-3 py-1 rounded text-[10px] font-bold ${
                                req.status === 'approved' ? 'bg-gray-300 text-gray-700' : 'bg-green-600 text-white'
                              }`}
                            >
                              {req.status === 'approved' ? '許可済み (解除)' : '許可する'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* フッター */}
          <div className="fixed bottom-0 w-full max-w-[430px] bg-[#4B8BF5] text-white grid grid-cols-3 text-center text-xs border-t border-white/20">
            <button
              onClick={() => setAdminTab('overview')}
              className={`py-3 flex flex-col items-center justify-center gap-1 ${
                adminTab === 'overview' || adminTab === 'detail' ? 'bg-[#3B72D0] font-bold' : 'hover:bg-[#3B72D0]/50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>シフト</span>
            </button>

            <button
              onClick={() => setAdminTab('staff')}
              className={`py-3 flex flex-col items-center justify-center gap-1 ${
                adminTab === 'staff' ? 'bg-[#3B72D0] font-bold' : 'hover:bg-[#3B72D0]/50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>スタッフ</span>
            </button>

            <button
              onClick={() => setAdminTab('requests')}
              className={`py-3 flex flex-col items-center justify-center gap-1 relative ${
                adminTab === 'requests' ? 'bg-[#3B72D0] font-bold' : 'hover:bg-[#3B72D0]/50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>申請</span>
              {pendingLeaveCount > 0 && (
                <span className="absolute top-2 right-6 bg-red-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                  {pendingLeaveCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* スタッフ詳細編集モーダル */}
        {selectedStaff && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-gray-800 text-sm">スタッフ情報編集</h3>
                <button onClick={() => setSelectedStaff(null)} className="text-gray-400 font-bold text-lg">✕</button>
              </div>

              <form onSubmit={handleSaveStaffInfo} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">名前（氏名）</label>
                  <input
                    type="text"
                    value={staffForm.full_name}
                    onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                    className="w-full p-2 border rounded text-gray-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">在留資格</label>
                  <input
                    type="text"
                    value={staffForm.visa_status}
                    onChange={(e) => setStaffForm({ ...staffForm, visa_status: e.target.value })}
                    className="w-full p-2 border rounded text-gray-800"
                  />
                </div>
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStaff(null)}
                    className="flex-1 py-2 bg-gray-200 text-gray-700 rounded font-bold"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-[#4B8BF5] text-white rounded font-bold"
                  >
                    保存
                  </button>
                </div>
                {staffSaveMsg && <p className="text-center font-bold text-[#4B8BF5] mt-1">{staffSaveMsg}</p>}
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ログイン画面
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow-md space-y-5">
        <h1 className="text-xl font-bold text-center text-gray-800">
          {authMode === 'login' && 'ログイン'}
          {authMode === 'signup' && '新規アカウント登録'}
        </h1>

        {authMode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">メールアドレス</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4B8BF5]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">パスワード</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4B8BF5]"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#4B8BF5] text-white font-bold py-3 rounded-lg text-sm shadow hover:bg-[#3B72D0] transition"
            >
              ログイン
            </button>
            <div className="border-t pt-4 text-center">
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className="w-full bg-green-600 text-white font-bold py-3 rounded-lg text-sm shadow hover:bg-green-700 transition"
              >
                新規登録はこちら
              </button>
            </div>
          </form>
        )}

        {authMode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">お名前 *</label>
              <input
                type="text"
                required
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">パスワード *</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white font-bold py-3 rounded-lg text-sm shadow hover:bg-green-700 transition"
            >
              アカウントを作成する
            </button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="text-xs text-[#4B8BF5] font-bold underline"
              >
                ログイン画面に戻る
              </button>
            </div>
          </form>
        )}

        {message && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-gray-800 font-bold text-center">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}