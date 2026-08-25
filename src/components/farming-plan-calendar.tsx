"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  activitiesByStage,
  growthStages,
  type GrowthStageLabel,
} from "@/lib/constants";

type Farm = { id: string; farmName: string; farmCode: string };
type Plan = {
  id: string;
  plannedDate: string;
  createdAt: string;
  title: string;
  stage: string;
  activityType: string;
  otherActivity: string | null;
  plannedMaterial: string | null;
  plannedQuantity: string | null;
  notes: string | null;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED";
  farmId: string;
  farm: { farmName: string; farmCode: string };
};
type Draft = {
  date: string;
  time: string;
  stage: GrowthStageLabel | "";
  activity: string;
  otherActivity: string;
  plannedMaterial: string;
  plannedQuantity: string;
  notes: string;
};
type Quick = "all" | "today" | "upcoming" | "overdue" | "completed";

const stageLabels: Record<string, GrowthStageLabel> = {
  POST_HARVEST_RECOVERY: "Phục hồi sau thu hoạch",
  MAKING_SPROUT: "Làm đọt",
  FLOWER_INDUCTION: "Xử lý ra hoa",
  FLOWERING: "Ra hoa",
  FRUIT_SETTING: "Đậu trái",
  FRUIT_GROWING: "Nuôi trái",
  PRE_HARVEST: "Trước thu hoạch",
  HARVEST: "Thu hoạch",
};
const activityLabels: Record<string, string> = {
  BASE_FERTILIZING: "Bón lót",
  PLANTING: "Trồng",
  MULCHING: "Tủ gốc",
  SPRAY_PESTICIDE: "Phun thuốc BVTV",
  FERTILIZE: "Bón phân",
  FOLIAR_FERTILIZING: "Phun phân bón lá",
  IRRIGATE: "Tưới nước",
  PRUNE: "Tỉa cành / tạo tán",
  WEEDING: "Làm cỏ",
  SHOOT_MANAGEMENT: "Quản lý đọt",
  WATER_STRESS: "Xiết nước",
  FLOWER_INDUCTION: "Xử lý ra hoa",
  FLOWER_THINNING: "Tỉa bông",
  POLLINATION: "Thụ phấn",
  FRUIT_THINNING: "Tỉa trái",
  PEST_INSPECTION: "Kiểm tra sâu bệnh",
  TRACK_FRUIT: "Theo dõi trái",
  FRUIT_BAGGING: "Bao trái",
  BRANCH_SUPPORT: "Chống cành",
  HARVEST: "Thu hoạch",
  FRUIT_GRADING: "Phân loại trái",
  GARDEN_SANITATION: "Vệ sinh vườn",
  OTHER: "Khác",
};
const todayKey = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
    new Date(),
  );
const dateKey = (value: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(
    new Date(value),
  );
const timeText = (value: string) => {
  const result = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
  return ["00:00", "24:00"].includes(result) ? "—" : result;
};
const blank = (): Draft => ({
  date: todayKey(),
  time: "",
  stage: "",
  activity: "",
  otherActivity: "",
  plannedMaterial: "",
  plannedQuantity: "",
  notes: "",
});

export function FarmingPlanCalendar() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [quick, setQuick] = useState<Quick>("all");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [activity, setActivity] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState<Plan | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/farming-plans", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.message || "Không thể tải kế hoạch.");
      setPlans(payload.plans ?? []);
      setFarms(payload.farms ?? []);
      setFarmId((current) => current || payload.farms?.[0]?.id || "");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể tải kế hoạch.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const currentFarm = farms.find((farm) => farm.id === farmId);
  const today = todayKey();
  const filtered = useMemo(
    () =>
      plans
        .filter((plan) => {
          if (plan.farmId !== farmId) return false;
          const date = dateKey(plan.plannedDate);
          const completed = plan.status === "COMPLETED";
          const overdue =
            new Date(plan.plannedDate).getTime() < Date.now() && !completed;
          if (quick === "today" && date !== today) return false;
          if (quick === "upcoming" && (date <= today || completed))
            return false;
          if (quick === "overdue" && !overdue) return false;
          if (quick === "completed" && !completed) return false;
          if (month && date.slice(5, 7) !== month) return false;
          if (year && date.slice(0, 4) !== year) return false;
          if (activity && plan.activityType !== activity) return false;
          const query = search.trim().toLowerCase();
          return (
            !query ||
            `${plan.title} ${plan.otherActivity ?? ""} ${plan.plannedMaterial ?? ""} ${plan.plannedQuantity ?? ""} ${plan.notes ?? ""}`
              .toLowerCase()
              .includes(query)
          );
        })
        .sort(
          (a, b) =>
            new Date(a.plannedDate).getTime() -
            new Date(b.plannedDate).getTime(),
        ),
    [activity, farmId, month, plans, quick, search, today, year],
  );
  const years = useMemo(
    () =>
      Array.from(
        new Set([
          new Date().getFullYear(),
          ...plans.map((plan) => Number(dateKey(plan.plannedDate).slice(0, 4))),
        ]).values(),
      ).sort((a, b) => a - b),
    [plans],
  );

  function openAdd() {
    if (!farmId) return;
    setEditing(null);
    setDraft(blank());
    setFormOpen(true);
    setError("");
  }
  function openEdit(plan: Plan) {
    const stage = stageLabels[plan.stage] ?? growthStages[0];
    setEditing(plan);
    setDraft({
      date: dateKey(plan.plannedDate),
      time:
        timeText(plan.plannedDate) === "—" ? "" : timeText(plan.plannedDate),
      stage,
      activity:
        activityLabels[plan.activityType] ?? plan.otherActivity ?? "Khác",
      otherActivity: plan.otherActivity ?? "",
      plannedMaterial: plan.plannedMaterial ?? "",
      plannedQuantity: plan.plannedQuantity ?? "",
      notes: plan.notes ?? "",
    });
    setFormOpen(true);
    setError("");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!currentFarm) return;
    setSaving(true);
    setError("");
    try {
      const title =
        draft.activity === "Khác" ? draft.otherActivity.trim() : draft.activity;
      const response = await fetch(
        editing ? `/api/farming-plans/${editing.id}` : "/api/farming-plans",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(!editing ? { farmId } : {}),
            plannedDate: draft.date,
            plannedTime: draft.time,
            title,
            stage: draft.stage,
            activityType: draft.activity,
            otherActivity: draft.otherActivity,
            plannedMaterial: draft.plannedMaterial,
            plannedQuantity: draft.plannedQuantity,
            notes: draft.notes,
          }),
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.message || "Không thể lưu công việc.");
      setFormOpen(false);
      await load();
      window.dispatchEvent(new Event("plans-updated"));
      setToast(editing ? "Đã cập nhật công việc." : "Đã thêm công việc.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể lưu công việc.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function toggle(plan: Plan, isCompleted: boolean) {
    setError("");
    const response = await fetch(`/api/farming-plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.message || "Không thể cập nhật công việc.");
      return;
    }
    setPlans((current) =>
      current.map((item) =>
        item.id === plan.id
          ? { ...item, status: isCompleted ? "COMPLETED" : "PLANNED" }
          : item,
      ),
    );
    window.dispatchEvent(new Event("plans-updated"));
    setToast(
      isCompleted
        ? "Đã đánh dấu công việc hoàn thành."
        : "Đã chuyển công việc về chưa thực hiện.",
    );
  }
  async function remove() {
    if (!deleting) return;
    setSaving(true);
    const response = await fetch(`/api/farming-plans/${deleting.id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setDeleting(null);
      await load();
      window.dispatchEvent(new Event("plans-updated"));
      setToast("Đã xóa công việc.");
    } else setError("Không thể xóa công việc.");
    setSaving(false);
  }

  return (
    <main className="mx-auto min-h-screen max-w-[1500px] space-y-5 px-3.5 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-brand-800 to-brand-600 p-4 text-white shadow-lg sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-brand-100">
            Quản lý canh tác
          </p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">
            Kế hoạch công việc
          </h1>
          <p className="mt-2 text-sm text-brand-50">
            Lập và theo dõi các công việc dự kiến tại vườn.
          </p>
        </div>
        <Button
          className="w-full bg-white font-bold text-brand-700 hover:bg-brand-50 sm:w-auto"
          onClick={openAdd}
          disabled={!farmId}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm công việc
        </Button>
      </header>
      {error && (
        <p className="rounded-2xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}
      {toast && (
        <div className="fixed right-4 top-20 z-[120] rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
          {toast.includes("hoàn thành") && (
            <Link
              href="/dashboard/farmer/logs/new"
              className="ml-3 text-brand-300 underline"
            >
              Ghi vào nhật ký
            </Link>
          )}
        </div>
      )}
      <section className="space-y-4 rounded-3xl border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(
            [
              ["all", "Tất cả"],
              ["today", "Hôm nay"],
              ["upcoming", "Sắp tới"],
              ["overdue", "Quá hạn"],
              ["completed", "Đã thực hiện"],
            ] as [Quick, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setQuick(value)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${quick === value ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div>
          {farms.length === 1 ? (
            <div className="rounded-2xl bg-brand-50 px-4 py-3">
              <p className="text-xs font-semibold text-brand-700">
                Vườn đang xem
              </p>
              <p className="font-bold text-slate-900">
                {currentFarm?.farmName}
              </p>
            </div>
          ) : (
            <label className="block text-sm font-semibold text-slate-600">
              Vườn đang xem
              <select
                value={farmId}
                onChange={(event) => setFarmId(event.target.value)}
                className="mt-1 h-11 w-full rounded-xl border bg-white px-3"
              >
                <option value="" disabled>
                  Chọn vườn
                </option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.farmName}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="Tháng"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="h-11 rounded-xl border bg-white px-3 text-sm"
            >
              <option value="">Tất cả tháng</option>
              {Array.from({ length: 12 }, (_, index) =>
                String(index + 1).padStart(2, "0"),
              ).map((value) => (
                <option key={value} value={value}>
                  Tháng {Number(value)}
                </option>
              ))}
            </select>
            <select
              aria-label="Năm"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="h-11 rounded-xl border bg-white px-3 text-sm"
            >
              <option value="">Tất cả năm</option>
              {years.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
          <select
            aria-label="Hoạt động"
            value={activity}
            onChange={(event) => setActivity(event.target.value)}
            className="h-11 rounded-xl border bg-white px-3 text-sm"
          >
            <option value="">Tất cả hoạt động</option>
            {Object.entries(activityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Tìm hoạt động, vật tư, ghi chú..."
            />
          </div>
        </div>
      </section>
      <section className="overflow-hidden rounded-3xl border bg-white shadow-sm">
        <div className="space-y-3 p-3 md:hidden">
          {loading ? (
            <Loading />
          ) : filtered.length ? (
            filtered.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                                        toggle={toggle}
                edit={openEdit}
                remove={setDeleting}
              />
            ))
          ) : (
            <Empty />
          )}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {[
                  "Ngày",
                  "Giờ",
                  "Hoạt động",
                  "Vật tư sử dụng",
                  "Đã thực hiện",
                  "Thao tác",
                ].map((label) => (
                  <th key={label} className="p-4 text-center">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <Loading />
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((plan) => (
                  <PlanRow
                    key={plan.id}
                    plan={plan}
                    toggle={toggle}
                    edit={openEdit}
                    remove={setDeleting}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <Empty />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {formOpen && (
        <Modal
          title={editing ? "Chỉnh sửa công việc" : "Thêm công việc"}
          onClose={() => setFormOpen(false)}
        >
          <form onSubmit={save} className="space-y-4">
            <ReadOnly label="Vườn" value={currentFarm?.farmName ?? "—"} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ngày thực hiện *">
                <input
                  type="date"
                  required
                  value={draft.date}
                  onChange={(event) =>
                    setDraft({ ...draft, date: event.target.value })
                  }
                />
              </Field>
              <Field label="Giờ thực hiện">
                <input
                  type="time"
                  value={draft.time}
                  onChange={(event) =>
                    setDraft({ ...draft, time: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Giai đoạn canh tác *">
              <select
                required
                value={draft.stage}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    stage: event.target.value as GrowthStageLabel,
                    activity: "",
                  })
                }
              >
                <option value="" disabled>
                  Chọn giai đoạn
                </option>
                {growthStages.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </Field>
            <Field label="Hoạt động *">
              <select
                required
                disabled={!draft.stage}
                value={draft.activity}
                onChange={(event) =>
                  setDraft({ ...draft, activity: event.target.value })
                }
              >
                <option value="" disabled>
                  Chọn hoạt động
                </option>
                {draft.stage &&
                  activitiesByStage[draft.stage].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
              </select>
            </Field>
            {draft.activity === "Khác" && (
              <Field label="Tên hoạt động *">
                <input
                  required
                  value={draft.otherActivity}
                  onChange={(event) =>
                    setDraft({ ...draft, otherActivity: event.target.value })
                  }
                />
              </Field>
            )}
            <Field label="Vật tư sử dụng">
              <input
                value={draft.plannedMaterial}
                onChange={(event) =>
                  setDraft({ ...draft, plannedMaterial: event.target.value })
                }
                placeholder="Ví dụ: NPK 16-16-8"
              />
            </Field>
            <Field label="Số lượng / Liều lượng dự kiến">
              <input
                value={draft.plannedQuantity}
                onChange={(event) =>
                  setDraft({ ...draft, plannedQuantity: event.target.value })
                }
                placeholder="Ví dụ: 2 kg"
              />
            </Field>
            <Field label="Ghi chú">
              <textarea
                rows={3}
                value={draft.notes}
                onChange={(event) =>
                  setDraft({ ...draft, notes: event.target.value })
                }
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                Hủy
              </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        saving ||
                                        !draft.date ||
                                        !draft.stage ||
                                        !draft.activity ||
                                        (draft.activity === "Khác" && !draft.otherActivity.trim())
                                    }
                                >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Lưu thay đổi" : "Thêm công việc"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title="Xóa công việc?" onClose={() => setDeleting(null)}>
          <p className="text-sm text-slate-600">
            Công việc này sẽ bị xóa khỏi kế hoạch của bạn.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Hủy
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              disabled={saving}
              onClick={() => void remove()}
            >
              Xóa công việc
            </Button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function PlanRow({ plan, toggle, edit, remove }: PlanActions) {
  const overdue =
    new Date(plan.plannedDate).getTime() < Date.now() &&
    plan.status !== "COMPLETED";
  return (
    <tr className="hover:bg-slate-50">
      <td
        className={`p-4 text-center font-semibold ${overdue ? "text-rose-700" : ""}`}
      >
        {new Date(`${dateKey(plan.plannedDate)}T00:00:00`).toLocaleDateString(
          "vi-VN",
        )}
        {overdue && <small className="block text-[10px]">Quá hạn</small>}
      </td>
      <td className="p-4 text-center">{timeText(plan.plannedDate)}</td>
      <td className="p-4 font-semibold">
        {plan.otherActivity || activityLabels[plan.activityType] || plan.title}
      </td>
      <td className="p-4">
        <Material plan={plan} />
      </td>
      <td className="p-4 text-center">
        <CheckBox
          checked={plan.status === "COMPLETED"}
          onChange={(checked) => void toggle(plan, checked)}
        />
      </td>
      <td className="p-4">
        <div className="flex justify-center gap-1">
          <IconButton label="Chỉnh sửa" onClick={() => edit(plan)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton label="Xóa công việc" danger onClick={() => remove(plan)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </td>
    </tr>
  );
}
function PlanCard({ plan, toggle, edit, remove }: PlanActions) {
  const overdue =
    new Date(plan.plannedDate).getTime() < Date.now() &&
    plan.status !== "COMPLETED";
  return (
    <article className="rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={`text-xs font-bold ${overdue ? "text-rose-600" : "text-slate-400"}`}
          >
            {new Date(
              `${dateKey(plan.plannedDate)}T00:00:00`,
            ).toLocaleDateString("vi-VN")}{" "}
            · {timeText(plan.plannedDate)}
            {overdue ? " · Quá hạn" : ""}
          </p>
          <h3 className="mt-1 font-bold">
            {plan.otherActivity ||
              activityLabels[plan.activityType] ||
              plan.title}
          </h3>
        </div>
        <CheckBox
          checked={plan.status === "COMPLETED"}
          onChange={(checked) => void toggle(plan, checked)}
        />
      </div>
      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
        <p className="text-xs text-slate-400">Vật tư dự kiến</p>
        <Material plan={plan} />
      </div>
      <div className="mt-3 flex justify-end gap-1">
        <IconButton label="Chỉnh sửa" onClick={() => edit(plan)}>
          <Pencil className="h-4 w-4" />
        </IconButton>
        <IconButton label="Xóa công việc" danger onClick={() => remove(plan)}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </article>
  );
}
type PlanActions = {
  plan: Plan;
  toggle: (plan: Plan, checked: boolean) => Promise<void>;
  edit: (plan: Plan) => void;
  remove: (plan: Plan) => void;
};
function Material({ plan }: { plan: Plan }) {
  const items = (plan.plannedMaterial ?? "")
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!items.length) return <>—</>;
  return (
    <>
      <span className="font-semibold">{items[0]}</span>
      {plan.plannedQuantity && (
        <small className="block text-slate-500">{plan.plannedQuantity}</small>
      )}
      {items.length > 1 && (
        <small className="block text-brand-700">
          +{items.length - 1} vật tư
        </small>
      )}
    </>
  );
}
function CheckBox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      aria-label={
        checked ? "Bỏ đánh dấu đã thực hiện" : "Đánh dấu đã thực hiện"
      }
      className="h-5 w-5 cursor-pointer rounded border-slate-300 accent-emerald-600"
    />
  );
}
function IconButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-full ${danger ? "text-rose-600 hover:bg-rose-50" : "text-brand-700 hover:bg-brand-50"}`}
    >
      {children}
    </button>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      {
        <div className="mt-1 [&>*]:w-full [&>*]:rounded-xl [&>*]:border [&>*]:px-3 [&>*]:py-2">
          {children}
        </div>
      }
    </label>
  );
}
function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-brand-50 p-3">
      <p className="text-xs font-semibold text-brand-700">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}
function Loading() {
  return (
    <div className="py-14 text-center">
      <Loader2 className="mx-auto h-7 w-7 animate-spin text-brand-600" />
    </div>
  );
}
function Empty() {
  return (
    <div className="py-14 text-center text-sm text-slate-500">
      Chưa có công việc phù hợp.
    </div>
  );
}
