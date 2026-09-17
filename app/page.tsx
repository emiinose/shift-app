'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

// 日本の祝日データ
const HOLIDAYS = [
  '2026-01-01', '2026-01-12', '2026-02-11', '2026-02-23', 
  '2026-03-20', '2026-04-29', '2026-05-03', '2026-05-04', 
  '2026-05-05', '2026-07-20', '2026-08-11', '2026-09-21', 
  '2026-09-22', '2026-09-23', '2026-10-12', '2026-11-03', 
  '2026-11-23',
]

const isHoliday = (dateStr: string) => {
  return HOLIDAYS.includes(dateStr)
}

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

  // タブステート
  const [adminTab, setAdminTab] = useState<'overview' | 'requests' | 'staff' | 'detail'>('overview')
  const [employeeSubView, setEmployeeSubView] = useState<'list' | 'form'>('list') // スタッフ用申請サブビュー

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
  const [slideDirection, setSlideDirection] = useState<number>(0)

  // 休み申請用ステート
  const [leaveRequests, setLeaveRequests] = useState<any[]>([])
  
  // スタッフ新規休み申請フォーム用ステート
  const [leaveForm, setLeaveForm] = useState({
    nameKana: '',
    siteName: '佐川',
    leaveDate: selectedDate,
    reason: '',
  })
  const [leaveSubmitting, setLeaveSubmitting] = useState(false)

  // スタッフ表示・編集用ステート
  const [selectedStaff, setSelectedStaff] = useState<any>(null)
  const [staffSubView, setStaffSubView] = useState<'list' | 'profile' | 'edit' | 'add'>('list')
  const [staffForm, setStaffForm] = useState({
    full_name: '',
    name_kana: '',
    address_city: '',
    visa_status: '',
    birth_year: '1995',
    birth_month: '01',
    birth_day: '01',
    phone_number: '',
    email: '',
    registration_date: '',
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
  }, [router, supabase])

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) {
      setUserProfile(data)
      setUserRole(data.role as 'admin' | 'employee')
      if (data.name_kana) {
        setLeaveForm(prev => ({ ...prev, nameKana: data.name_kana }))
      }
    }
  }

  const loadAllData = async () => {
    const { data: shiftData } = await supabase.from('shifts').select('*')
    if (shiftData) setShifts(shiftData)

    const { data: profileData } = await supabase.from('profiles').select('*')
    if (profileData) {
      setAllUsers(profileData)
      setSelectedStaff((prev: any) => {
        if (!prev) return null
        const updated = profileData.find((u: any) => u.id === prev.id)
        return updated || prev
      })
    }

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

  // スタッフによる新規休み申請送信
  const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) return

    setLeaveSubmitting(true)
    const { error } = await supabase.from('leave_requests').insert([
      {
        user_id: session.user.id,
        user_email: session.user.email,
        leave_date: leaveForm.leaveDate,
        site_name: leaveForm.siteName,
        reason: leaveForm.reason,
        status: 'pending',
      },
    ])

    setLeaveSubmitting(false)
    if (error) {
      alert(`申請エラー: ${error.message}`)
    } else {
      alert('休み申請を送信しました。')
      setLeaveForm(prev => ({ ...prev, reason: '' }))
      setEmployeeSubView('list')
      loadAllData()
    }
  }

  const handleSelectStaff = (user: any) => {
    setSelectedStaff(user)

    let bYear = '1995'
    let bMonth = '01'
    let bDay = '01'

    if (user.birth_date) {
      const parts = user.birth_date.split('-')
      if (parts.length === 3) {
        bYear = parts[0]
        bMonth = parts[1]
        bDay = parts[2]
      }
    }

    setStaffForm({
      full_name: user.full_name || '',
      name_kana: user.name_kana || '',
      address_city: user.address_city || '',
      visa_status: user.visa_status || '',
      birth_year: bYear,
      birth_month: bMonth,
      birth_day: bDay,
      phone_number: user.phone_number || '',
      email: user.email || '',
      registration_date: user.registration_date || '',
    })
    setStaffSaveMsg('')
    setStaffSubView('profile')
  }

  // 新規スタッフ追加画面の呼び出し
  const handleOpenAddStaffForm = () => {
    setSelectedStaff(null)
    setStaffForm({
      full_name: '',
      name_kana: '',
      address_city: '',
      visa_status: '',
      birth_year: '1995',
      birth_month: '01',
      birth_day: '01',
      phone_number: '',
      email: '',
      registration_date: '',
    })
    setStaffSaveMsg('')
    setStaffSubView('add')
  }

  // スタッフ情報の保存（更新または新規作成）
  const handleSaveStaffInfo = async (e: React.FormEvent) => {
    e.preventDefault()

    setStaffSaveMsg('保存中...')
    const birthDateStr = `${staffForm.birth_year}-${String(staffForm.birth_month).padStart(2, '0')}-${String(staffForm.birth_day).padStart(2, '0')}`

    const staffData = {
      full_name: staffForm.full_name,
      name_kana: staffForm.name_kana,
      address_city: staffForm.address_city,
      visa_status: staffForm.visa_status,
      birth_date: birthDateStr,
      phone_number: staffForm.phone_number,
      email: staffForm.email,
      registration_date: staffForm.registration_date || null,
      role: 'employee',
    }

    let error
    if (staffSubView === 'add') {
      const res = await supabase.from('profiles').insert([staffData])
      error = res.error
    } else if (selectedStaff) {
      const res = await supabase.from('profiles').update(staffData).eq('id', selectedStaff.id)
      error = res.error
    }

    if (error) {
      setStaffSaveMsg(`エラー: ${error.message}`)
    } else {
      setStaffSaveMsg('保存しました！')
      await loadAllData()

      setTimeout(() => {
        setStaffSaveMsg('')
        setStaffSubView('list')
      }, 600)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y} 年 ${m}月 ${d}日`
  }

  const changeMonth = (offset: number) => {
    setSlideDirection(offset)
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1))
  }

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
    // ==========================================
    // 1. スタッフ用画面 (デザインカンプ完全適用)
    // ==========================================
    if (userRole === 'employee') {
      const myLeaveRequests = leaveRequests.filter((r) => r.user_id === session.user.id)
      const dayShifts = shifts.filter(
        (s) => s.work_date === selectedDate && s.user_id === session.user.id
      )

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center pb-20">
          <div className="w-full max-w-[430px] bg-white min-h-screen shadow-md flex flex-col overflow-hidden relative">
            
            {/* --- シフトタブ表示 --- */}
            {adminTab === 'overview' && (
              <>
                {/* ヘッダー */}
                <div className="bg-[#4B8BF5] text-white p-4 pt-6 flex justify-between items-end">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                      {year}年{month + 1}月
                    </h1>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="text-xs text-white/80 hover:text-white underline"
                  >
                    ログアウト
                  </button>
                </div>

                {/* カレンダー */}
                <div className="grid grid-cols-7 text-center text-xs font-semibold bg-[#EBE8E1] text-gray-700 py-1.5 border-b border-gray-300">
                  <div>月</div>
                  <div>火</div>
                  <div>水</div>
                  <div>木</div>
                  <div>金</div>
                  <div className="text-[#4B8BF5]">土</div>
                  <div className="text-red-500">日</div>
                </div>

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
                        opacity: { duration: 0.15 },
                      }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      onDragEnd={(e, { offset, velocity }) => {
                        const swipe = Math.abs(offset.x) * velocity.x
                        if (offset.x < -60 || swipe < -400) {
                          changeMonth(1)
                        } else if (offset.x > 60 || swipe > 400) {
                          changeMonth(-1)
                        }
                      }}
                      className="grid grid-cols-7 w-full absolute top-0 left-0 cursor-grab active:cursor-grabbing select-none"
                    >
                      {calendarDays.map((item, idx) => {
                        const isSelected = selectedDate === item.dateStr
                        const isHolidayDate = isHoliday(item.dateStr)

                        const hasMyShift = shifts.some(
                          (s) => s.work_date === item.dateStr && s.user_id === session.user.id
                        )

                        let textColor = item.isCurrentMonth ? 'text-gray-800' : 'text-gray-400'
                        if (item.isCurrentMonth) {
                          if (item.dayOfWeek === 5) textColor = 'text-[#4B8BF5]'
                          if (item.dayOfWeek === 6 || isHolidayDate) textColor = 'text-red-500'
                        }

                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedDate(item.dateStr)}
                            className="h-12 border-r border-b border-gray-200 flex flex-col items-center justify-start pt-1 relative hover:bg-gray-50 transition"
                          >
                            <span
                              className={`text-xs font-medium leading-none w-6 h-6 flex items-center justify-center ${
                                isSelected ? 'bg-[#4B8BF5] text-white rounded-full font-bold' : textColor
                              }`}
                            >
                              {item.day}
                            </span>

                            {hasMyShift && (
                              <span className="text-yellow-400 text-xs leading-none mt-0.5">★</span>
                            )}
                          </button>
                        )
                      })}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* 確定シフトリスト */}
                <div className="flex-1 p-4">
                  {dayShifts.length === 0 ? (
                    <div className="text-xs text-gray-400 py-4 text-center">
                      この日のシフトはありません
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayShifts.map((s) => {
                        const d = new Date(s.work_date)
                        const dateLabel = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
                        const timeLabel = s.start_time ? s.start_time.slice(0, 5) : ''

                        return (
                          <div
                            key={s.id}
                            className="flex items-center gap-6 py-2 border-b border-[#BCE0FD] text-xs text-gray-800"
                          >
                            <span className="font-normal">{dateLabel}</span>
                            <span className="font-normal">{s.site_name}</span>
                            <span className="font-normal">{timeLabel}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* --- 申請タブ表示 --- */}
            {adminTab === 'requests' && (
              <div className="flex-1 bg-white flex flex-col relative">
                {/* 1. 休み申請 一覧画面 */}
                {employeeSubView === 'list' && (
                  <div className="flex-1 flex flex-col">
                    <div className="bg-[#4B8BF5] h-32 w-full flex-shrink-0"></div>
                    <div className="px-6 pt-6 flex-1 flex flex-col">
                      <h2 className="text-center text-[#4B8BF5] font-normal text-sm mb-6">
                        休み申請
                      </h2>

                      {myLeaveRequests.length === 0 ? (
                        <p className="text-xs text-gray-400 py-12 text-center">
                          申請履歴はありません
                        </p>
                      ) : (
                        <div className="space-y-0 text-xs">
                          {myLeaveRequests.map((req) => {
                            const isApproved = req.status === 'approved'
                            const dateFormatted = req.leave_date
                              ? req.leave_date.replace(/-/g, '/')
                              : ''

                            return (
                              <div
                                key={req.id}
                                className="flex items-center justify-between py-3.5 border-b border-[#D6E6FE]"
                              >
                                <span className="text-[#4B8BF5] w-24 font-normal">
                                  {dateFormatted}
                                </span>
                                <span className="text-gray-800 flex-1 px-2 font-normal">
                                  現場：{req.site_name || '佐川'}
                                </span>
                                <div className="w-20 flex justify-end">
                                  {isApproved ? (
                                    <span className="inline-block text-center w-16 py-1 border border-[#4B8BF5] text-[#4B8BF5] rounded-md text-[11px] font-normal">
                                      許可
                                    </span>
                                  ) : (
                                    <span className="inline-block text-center w-16 py-1 bg-[#4B8BF5] text-white rounded-md text-[11px] font-normal shadow-sm">
                                      許可待ち
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* フローティング プラスボタン */}
                      <div className="absolute right-8 bottom-24">
                        <button
                          onClick={() => setEmployeeSubView('form')}
                          className="w-14 h-14 bg-[#3B72D0] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#2B5290] transition-colors"
                        >
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. 申請フォーム画面 */}
                {employeeSubView === 'form' && (
                  <div className="flex-1 flex flex-col">
                    <div className="bg-[#4B8BF5] h-32 w-full flex-shrink-0"></div>
                    <div className="px-6 pt-8 flex-1 flex flex-col justify-between">
                      <form onSubmit={handleSubmitLeaveRequest} className="space-y-6">
                        <div className="border border-[#4B8BF5] rounded-xl p-5 space-y-4 text-xs">
                          <div className="flex items-center justify-between">
                            <label className="text-gray-700 w-1/3 font-normal">
                              お名前(フリガナ)
                            </label>
                            <input
                              type="text"
                              disabled
                              value={leaveForm.nameKana || userProfile?.name_kana || ''}
                              className="w-2/3 border border-[#4B8BF5] px-2 py-1 text-gray-500 bg-gray-100 rounded focus:outline-none cursor-not-allowed font-normal"
                            />
                          </div>
                           
                          <div className="flex items-center justify-between">
                            <label className="text-gray-700 w-1/3 font-normal">休み希望日</label>
                            <input
                              type="date"
                              required
                              value={leaveForm.leaveDate}
                              onChange={(e) => setLeaveForm({ ...leaveForm, leaveDate: e.target.value })}
                              className="w-2/3 border border-[#4B8BF5] px-2 py-1 text-gray-800 rounded focus:outline-none bg-white font-normal"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <label className="text-gray-700 w-1/3 font-normal">現場</label>
                            <div className="w-2/3 relative">
                              <select
                                value={leaveForm.siteName}
                                onChange={(e) => setLeaveForm({ ...leaveForm, siteName: e.target.value })}
                                className="w-full bg-[#E0E0E0] text-gray-700 px-3 py-1.5 rounded appearance-none focus:outline-none pr-8 font-normal"
                              >
                                {presetSites.map((site) => (
                                  <option key={site} value={site}>
                                    {site}
                                  </option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start justify-between">
                            <label className="text-gray-700 w-1/3 font-normal pt-1">理由</label>
                            <textarea
                              rows={4}
                              value={leaveForm.reason}
                              onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                              placeholder="例）体調不良"
                              className="w-2/3 bg-[#E0E0E0] text-gray-700 p-2.5 rounded focus:outline-none placeholder-gray-500 resize-none font-normal"
                            ></textarea>
                          </div>
                        </div>

                        <div className="flex justify-center pt-2">
                          <button
                            type="submit"
                            disabled={leaveSubmitting}
                            className="bg-[#3B72D0] text-white text-xs px-10 py-2 rounded-full font-medium hover:bg-[#2B5290] transition-colors shadow-sm disabled:opacity-50"
                          >
                            {leaveSubmitting ? '送信中...' : '送信'}
                          </button>
                        </div>
                      </form>

                      <div className="flex justify-end pb-8">
                        <button
                          type="button"
                          onClick={() => setEmployeeSubView('list')}
                          className="flex items-center gap-1 text-[#3B72D0] text-xs font-normal hover:underline"
                        >
                          <span>戻る</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* スタッフ用フッター */}
            <div className="fixed bottom-0 w-full max-w-[430px] bg-[#4B8BF5] text-white grid grid-cols-2 text-center text-xs border-t border-white/20 z-10">
              <button
                onClick={() => {
                  setAdminTab('overview')
                  setEmployeeSubView('list')
                }}
                className={`py-3 flex flex-col items-center justify-center gap-1 ${
                  adminTab === 'overview' ? 'bg-[#3B72D0] font-bold' : 'hover:bg-[#3B72D0]/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>シフト</span>
              </button>

              <button
                onClick={() => {
                  setAdminTab('requests')
                  setEmployeeSubView('list')
                }}
                className={`py-3 flex flex-col items-center justify-center gap-1 ${
                  adminTab === 'requests' ? 'bg-[#3B72D0] font-bold' : 'hover:bg-[#3B72D0]/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>申請</span>
              </button>
            </div>

          </div>
        </div>
      )
    }

    // ==========================================
    // 2. 管理者用画面 (管理者のみ閲覧可能)
    // ==========================================
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center pb-20">
        <div className="w-full max-w-[430px] bg-white min-h-screen shadow-md flex flex-col overflow-hidden relative">
          
          {adminTab !== 'staff' && (
            <div className="bg-[#4B8BF5] text-white p-4 pt-6 flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{year}年{month + 1}月</h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold">
                  管理者
                </span>
                <button onClick={handleSignOut} className="text-xs text-white/80 hover:text-white underline">
                  ログアウト
                </button>
              </div>
            </div>
          )}

          {(adminTab === 'overview' || adminTab === 'detail') && (
            <>
              <div className="grid grid-cols-7 text-center text-xs font-semibold bg-[#EBE8E1] text-gray-700 py-1.5 border-b border-gray-300">
                <div>月</div>
                <div>火</div>
                <div>水</div>
                <div>木</div>
                <div>金</div>
                <div className="text-[#4B8BF5]">土</div>
                <div className="text-red-500">日</div>
              </div>

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
                        changeMonth(1)
                      } else if (offset.x > 60 || swipe > 400) {
                        changeMonth(-1)
                      }
                    }}
                    className="grid grid-cols-7 w-full absolute top-0 left-0 cursor-grab active:cursor-grabbing select-none"
                  >
                    {calendarDays.map((item, idx) => {
                      const isSelected = selectedDate === item.dateStr
                      const isHolidayDate = isHoliday(item.dateStr)

                      let textColor = item.isCurrentMonth ? 'text-gray-800' : 'text-gray-400'
                      if (item.isCurrentMonth) {
                        if (item.dayOfWeek === 5) textColor = 'text-[#4B8BF5]'
                        if (item.dayOfWeek === 6 || isHolidayDate) textColor = 'text-red-500'
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
            </>
          )}

          <div className="flex-1 flex flex-col">
            {(adminTab === 'overview' || adminTab === 'detail') && (
              <div className="p-4">
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
              <div className="flex-1 bg-white flex flex-col relative">
                {/* 1. スタッフ一覧 */}
                {staffSubView === 'list' && (
                  <div className="flex-1 bg-white flex flex-col">
                    <div className="bg-[#4B8BF5] h-32 w-full flex-shrink-0"></div>
                    <div className="px-6 pt-6 flex-1 pb-24">
                      {allUsers.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => handleSelectStaff(u)}
                          className="flex items-center justify-between py-3 border-b border-[#BCE0FD] cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-gray-800 text-sm font-normal">
                            {u.full_name || 'Name'}
                          </span>
                          <svg className="w-4 h-4 text-[#4B8BF5]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      ))}
                    </div>

                    {/* ★新規スタッフ追加のフローティング プラスボタン */}
                    <div className="absolute right-8 bottom-20 z-10">
                      <button
                        onClick={handleOpenAddStaffForm}
                        className="w-14 h-14 bg-[#3B72D0] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#2B5290] transition-colors"
                      >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. スタッフプロフィール閲覧 */}
                {staffSubView === 'profile' && selectedStaff && (
                  <div className="flex-1 bg-white flex flex-col">
                    <div className="bg-[#4B8BF5] h-32 w-full flex-shrink-0"></div>
                    <div className="px-6 pt-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h2 className="text-center text-[#4B8BF5] font-medium text-base mb-6">
                          プロフィール
                        </h2>

                        <div className="space-y-0 text-sm">
                          <div className="flex justify-between items-center py-3.5 border-b border-[#D6E6FE]">
                            <span className="text-[#4B8BF5] font-normal w-1/3">お名前</span>
                            <span className="text-gray-800 font-normal w-2/3 pl-2">{selectedStaff.full_name || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center py-3.5 border-b border-[#D6E6FE]">
                            <span className="text-[#4B8BF5] font-normal w-1/3">お名前(フリガナ)</span>
                            <span className="text-gray-800 font-normal w-2/3 pl-2">{selectedStaff.name_kana || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center py-3.5 border-b border-[#D6E6FE]">
                            <span className="text-[#4B8BF5] font-normal w-1/3">市区町村</span>
                            <span className="text-gray-800 font-normal w-2/3 pl-2">{selectedStaff.address_city || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center py-3.5 border-b border-[#D6E6FE]">
                            <span className="text-[#4B8BF5] font-normal w-1/3">在留資格</span>
                            <span className="text-gray-800 font-normal w-2/3 pl-2">{selectedStaff.visa_status || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center py-3.5 border-b border-[#D6E6FE]">
                            <span className="text-[#4B8BF5] font-normal w-1/3">誕生日</span>
                            <span className="text-gray-800 font-normal w-2/3 pl-2">{formatDate(selectedStaff.birth_date)}</span>
                          </div>
                          <div className="flex justify-between items-center py-3.5 border-b border-[#D6E6FE]">
                            <span className="text-[#4B8BF5] font-normal w-1/3">電話番号</span>
                            <span className="text-gray-800 font-normal w-2/3 pl-2">{selectedStaff.phone_number || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center py-3.5 border-b border-[#D6E6FE]">
                            <span className="text-[#4B8BF5] font-normal w-1/3">メールアドレス</span>
                            <span className="text-gray-800 font-normal w-2/3 pl-2 break-all">{selectedStaff.email || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center py-3.5 border-b border-[#D6E6FE]">
                            <span className="text-[#4B8BF5] font-normal w-1/3">入社日</span>
                            <span className="text-gray-800 font-normal w-2/3 pl-2">{formatDate(selectedStaff.registration_date)}</span>
                          </div>
                        </div>

                        <div className="flex justify-center mt-8">
                          <button
                            onClick={() => setStaffSubView('edit')}
                            className="bg-[#4B8BF5] text-white text-xs px-8 py-2 rounded-full font-medium hover:bg-[#3B72D0] transition-colors shadow-sm"
                          >
                            編集
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end mt-6 mb-6">
                        <button
                          onClick={() => setStaffSubView('list')}
                          className="flex items-center gap-1 text-[#4B8BF5] text-xs font-normal hover:underline"
                        >
                          <span>戻る</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. スタッフ編集・新規追加フォーム */}
                {(staffSubView === 'edit' || staffSubView === 'add') && (
                  <div className="flex-1 bg-white flex flex-col">
                    <div className="bg-[#4B8BF5] h-32 w-full flex-shrink-0"></div>
                    <div className="px-6 pt-6 flex-1 flex flex-col">
                      <h2 className="text-center text-[#4B8BF5] font-medium text-base mb-6">
                        スタッフ情報{staffSubView === 'add' ? '追加' : ''}
                      </h2>

                      <form onSubmit={handleSaveStaffInfo} className="space-y-0 text-xs flex-1 flex flex-col justify-between pb-8">
                        <div className="space-y-0">
                          <div className="flex items-center justify-between py-2.5 border-b border-[#D6E6FE]">
                            <label className="text-gray-700 font-normal w-1/3">お名前</label>
                            <input
                              type="text"
                              placeholder="例）山田 太郎"
                              value={staffForm.full_name}
                              onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                              className="w-2/3 bg-[#E5E5E5] px-3 py-1.5 rounded text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#4B8BF5]"
                            />
                          </div>

                          <div className="flex items-center justify-between py-2.5 border-b border-[#D6E6FE]">
                            <label className="text-gray-700 font-normal w-1/3">お名前(フリガナ)</label>
                            <input
                              type="text"
                              placeholder="例）ヤマダ タロウ"
                              value={staffForm.name_kana}
                              onChange={(e) => setStaffForm({ ...staffForm, name_kana: e.target.value })}
                              className="w-2/3 bg-[#E5E5E5] px-3 py-1.5 rounded text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#4B8BF5]"
                            />
                          </div>

                          <div className="flex items-center justify-between py-2.5 border-b border-[#D6E6FE]">
                            <label className="text-gray-700 font-normal w-1/3">市区町村</label>
                            <input
                              type="text"
                              placeholder="例）中川区"
                              value={staffForm.address_city}
                              onChange={(e) => setStaffForm({ ...staffForm, address_city: e.target.value })}
                              className="w-2/3 bg-[#E5E5E5] px-3 py-1.5 rounded text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#4B8BF5]"
                            />
                          </div>

                          <div className="flex items-center justify-between py-2.5 border-b border-[#D6E6FE]">
                            <label className="text-gray-700 font-normal w-1/3">在留資格</label>
                            <input
                              type="text"
                              placeholder="例）家族滞在"
                              value={staffForm.visa_status}
                              onChange={(e) => setStaffForm({ ...staffForm, visa_status: e.target.value })}
                              className="w-2/3 bg-[#E5E5E5] px-3 py-1.5 rounded text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#4B8BF5]"
                            />
                          </div>

                          <div className="flex items-center justify-between py-2.5 border-b border-[#D6E6FE]">
                            <label className="text-gray-700 font-normal w-1/3">誕生日</label>
                            <div className="w-2/3 flex items-center gap-1">
                              <select
                                value={staffForm.birth_year}
                                onChange={(e) => setStaffForm({ ...staffForm, birth_year: e.target.value })}
                                className="bg-[#E5E5E5] px-2 py-1 rounded text-gray-800 text-xs focus:outline-none"
                              >
                                {Array.from({ length: 80 }, (_, i) => 1950 + i).map(y => (
                                  <option key={y} value={y}>{y}</option>
                                ))}
                              </select>
                              <span className="text-gray-700">年</span>

                              <select
                                value={staffForm.birth_month}
                                onChange={(e) => setStaffForm({ ...staffForm, birth_month: e.target.value })}
                                className="bg-[#E5E5E5] px-2 py-1 rounded text-gray-800 text-xs focus:outline-none"
                              >
                                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>
                              <span className="text-gray-700">月</span>

                              <select
                                value={staffForm.birth_day}
                                onChange={(e) => setStaffForm({ ...staffForm, birth_day: e.target.value })}
                                className="bg-[#E5E5E5] px-2 py-1 rounded text-gray-800 text-xs focus:outline-none"
                              >
                                {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(d => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                              <span className="text-gray-700">日</span>
                            </div>
                          </div>

                          <div className="py-2.5 border-b border-[#D6E6FE]">
                            <div className="flex items-center justify-between">
                              <label className="text-gray-700 font-normal w-1/3">電話番号</label>
                              <input
                                type="text"
                                placeholder="例）000 0000 0000"
                                value={staffForm.phone_number}
                                onChange={(e) => setStaffForm({ ...staffForm, phone_number: e.target.value })}
                                className="w-2/3 bg-[#E5E5E5] px-3 py-1.5 rounded text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#4B8BF5]"
                              />
                            </div>
                            <p className="text-right text-[10px] text-gray-500 pt-1">ハイフンなし</p>
                          </div>

                          <div className="flex items-center justify-between py-2.5 border-b border-[#D6E6FE]">
                            <label className="text-gray-700 font-normal w-1/3">メールアドレス</label>
                            <input
                              type="email"
                              value={staffForm.email}
                              onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                              className="w-2/3 bg-white border border-[#4B8BF5] px-3 py-1.5 rounded text-gray-800 focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-between py-2.5 border-b border-[#D6E6FE]">
                            <label className="text-gray-700 font-normal w-1/3">入社日</label>
                            <input
                              type="text"
                              placeholder="例）1234年05月06日"
                              value={staffForm.registration_date}
                              onChange={(e) => setStaffForm({ ...staffForm, registration_date: e.target.value })}
                              className="w-2/3 bg-[#E5E5E5] px-3 py-1.5 rounded text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#4B8BF5]"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col items-center mt-8">
                          <button
                            type="submit"
                            className="bg-[#4B8BF5] text-white text-xs px-10 py-2 rounded-full font-medium hover:bg-[#3B72D0] transition-colors shadow-sm"
                          >
                            登録
                          </button>
                          {staffSaveMsg && (
                            <p className="text-xs text-[#4B8BF5] font-bold mt-2">{staffSaveMsg}</p>
                          )}
                        </div>
                      </form>

                      {/* 戻る リンク */}
                      <div className="flex justify-end pb-8">
                        <button
                          type="button"
                          onClick={() => setStaffSubView('list')}
                          className="flex items-center gap-1 text-[#4B8BF5] text-xs font-normal hover:underline"
                        >
                          <span>戻る</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {adminTab === 'requests' && (
              <div className="space-y-4 p-4">
                {leaveRequests.length === 0 ? (
                  <p className="text-xs text-gray-400 py-8 text-center">休み申請はありません</p>
                ) : (
                  <div className="space-y-3">
                    {leaveRequests.map(req => {
                      const applicant = allUsers.find(u => u.id === req.user_id)
                      const isApproved = req.status === 'approved'

                      return (
                        <div 
                          key={req.id} 
                          className="flex items-center justify-between pb-2 border-b border-[#A0C4FF] text-xs text-gray-800"
                        >
                          <div className="w-24 font-normal">{req.leave_date}</div>
                          <div className="w-20 font-normal truncate">{applicant?.full_name || req.user_email || 'Name'}</div>
                          <div className="flex-1 text-center font-normal">現場 : {req.site_name || '佐川'}</div>
                          <div className="w-24 text-right">
                            <button
                              onClick={() => handleToggleLeaveStatus(req.id, req.status)}
                              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                                isApproved
                                  ? 'border border-[#4B8BF5] text-[#4B8BF5] bg-white hover:bg-blue-50'
                                  : 'bg-[#4B8BF5] text-white hover:bg-[#3B72D0]'
                              }`}
                            >
                              {isApproved ? '承認' : '許可する'}
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

          {/* 管理者用フッター（3分割） */}
          <div className="fixed bottom-0 w-full max-w-[430px] bg-[#4B8BF5] text-white grid grid-cols-3 text-center text-xs border-t border-white/20 z-20">
            <button
              onClick={() => {
                setAdminTab('overview')
                setStaffSubView('list')
              }}
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
              onClick={() => {
                setAdminTab('staff')
                setStaffSubView('list')
              }}
              className={`py-3 flex flex-col items-center justify-center gap-1 ${
                adminTab === 'staff' ? 'bg-[#3B72D0] font-bold' : 'hover:bg-[#3B72D0]/50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>スタッフ</span>
            </button>

            <button
              onClick={() => {
                setAdminTab('requests')
                setStaffSubView('list')
              }}
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
      </div>
    )
  }

  // ログイン未完了時
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