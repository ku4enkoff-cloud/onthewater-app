import { useEffect, useState } from 'react'
import { changePassword, deleteMyAccount, updateProfile } from '../../api/auth'

export default function AccountProfile({ token, user, setCurrentUser, logout }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [pwd, setPwd] = useState({ current_password: '', new_password: '' })
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMsg, setPwdMsg] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
    })
  }, [user?.first_name, user?.last_name, user?.phone])

  const saveProfile = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      setMsg('')
      const updated = await updateProfile(token, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
      })
      setCurrentUser(updated?.user || updated)
      setMsg('Данные сохранены')
    } catch (err) {
      setMsg(err?.message || 'Не удалось сохранить данные')
    } finally {
      setSaving(false)
    }
  }

  const savePassword = async (e) => {
    e.preventDefault()
    try {
      setPwdSaving(true)
      setPwdMsg('')
      await changePassword(token, pwd)
      setPwd({ current_password: '', new_password: '' })
      setPwdMsg('Пароль изменён')
    } catch (err) {
      setPwdMsg(err?.message || 'Не удалось изменить пароль')
    } finally {
      setPwdSaving(false)
    }
  }

  const removeAccount = async () => {
    if (!window.confirm('Удалить аккаунт без возможности восстановления?')) return
    try {
      setDeleting(true)
      await deleteMyAccount(token)
      logout()
    } catch (err) {
      window.alert(err?.message || 'Не удалось удалить аккаунт')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="acc-section" aria-labelledby="acc-profile-title">
      <h1 id="acc-profile-title" className="acc-title">
        Данные аккаунта
      </h1>

      <form className="acc-panel acc-form" onSubmit={saveProfile}>
        <h2 className="acc-subtitle">Личные данные</h2>
        <div className="acc-form__grid">
          <label className="acc-field">
            <span>Имя</span>
            <input value={form.first_name} onChange={(e) => setForm((v) => ({ ...v, first_name: e.target.value }))} autoComplete="given-name" />
          </label>
          <label className="acc-field">
            <span>Фамилия</span>
            <input value={form.last_name} onChange={(e) => setForm((v) => ({ ...v, last_name: e.target.value }))} autoComplete="family-name" />
          </label>
          <label className="acc-field">
            <span>Телефон</span>
            <input value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} autoComplete="tel" inputMode="tel" />
          </label>
          <label className="acc-field">
            <span>Почта</span>
            <input value={user?.email || ''} readOnly />
          </label>
        </div>
        <div className="acc-form__actions">
          <button type="submit" className="acc-btn" disabled={saving}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
          {msg ? <p className="acc-muted">{msg}</p> : null}
        </div>
      </form>

      <form className="acc-panel acc-form" onSubmit={savePassword}>
        <h2 className="acc-subtitle">Пароль</h2>
        <div className="acc-form__grid">
          <label className="acc-field">
            <span>Текущий пароль</span>
            <input
              type="password"
              value={pwd.current_password}
              onChange={(e) => setPwd((v) => ({ ...v, current_password: e.target.value }))}
              autoComplete="current-password"
            />
          </label>
          <label className="acc-field">
            <span>Новый пароль</span>
            <input
              type="password"
              value={pwd.new_password}
              onChange={(e) => setPwd((v) => ({ ...v, new_password: e.target.value }))}
              autoComplete="new-password"
            />
          </label>
        </div>
        <div className="acc-form__actions">
          <button
            type="submit"
            className="acc-btn acc-btn--ghost"
            disabled={pwdSaving || !pwd.current_password || !pwd.new_password}
          >
            {pwdSaving ? 'Меняем…' : 'Изменить пароль'}
          </button>
          {pwdMsg ? <p className="acc-muted">{pwdMsg}</p> : null}
        </div>
      </form>

      <div className="acc-panel acc-danger">
        <div>
          <h2 className="acc-subtitle">Удаление аккаунта</h2>
          <p className="acc-muted">Бронирования, переписка и отзывы будут удалены без возможности восстановления.</p>
        </div>
        <button type="button" className="acc-btn acc-btn--danger" onClick={removeAccount} disabled={deleting}>
          {deleting ? 'Удаляем…' : 'Удалить аккаунт'}
        </button>
      </div>
    </section>
  )
}
