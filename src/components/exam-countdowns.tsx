"use client";

import { useEffect, useState } from "react";

// CAC MOC NGAY DUOI DAY LA VI DU DE THU GIAO DIEN.
// Hay doi thanh ngay thi chinh thuc khi co thong bao tu don vi to chuc.
const exams = [
  {
    id: "tsa",
    name: "TSA",
    date: "2027-01-16T08:00:00+07:00",
    gradient: "from-[#DC3450] to-[#FB7460]",
    numberColor: "text-[#C82B43]",
  },
  {
    id: "vact",
    name: "V-ACT",
    date: "2027-03-28T08:00:00+07:00",
    gradient: "from-[#078BCC] to-[#5175F5]",
    numberColor: "text-[#087FC0]",
  },
  {
    id: "thpt",
    name: "THPT",
    date: "2027-06-11T07:30:00+07:00",
    gradient: "from-[#DA720E] to-[#F8B633]",
    numberColor: "text-[#D36A0C]",
  },
] as const;

function remainingTime(date: string, now: number) {
  const totalSeconds = Math.max(
    0,
    Math.floor((new Date(date).getTime() - now) / 1000),
  );

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isFinished: totalSeconds === 0,
  };
}

export function ExamCountdowns() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const updateTime = () => setNow(Date.now());
    updateTime();

    const timer = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="container-page py-8" aria-label="Đếm ngược các kỳ thi">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-[#332A27]">
          Đếm ngược các kỳ thi 2027
        </h2>
        <p className="mt-1 text-sm text-[#756C65]">
          Các mốc dưới đây đang dùng để thử giao diện; cần xác nhận lại lịch thi chính thức.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {exams.map((exam) => {
          const left = now === null ? null : remainingTime(exam.date, now);
          const values = [
            { label: "Ngày", value: left?.days },
            { label: "Giờ", value: left?.hours },
            { label: "Phút", value: left?.minutes },
            { label: "Giây", value: left?.seconds },
          ];

          return (
            <article
              key={exam.id}
              className={`rounded-2xl bg-gradient-to-r ${exam.gradient} p-4 text-white shadow-md sm:p-5`}
            >
              <div className="flex items-center gap-3">
                <div className="w-16 shrink-0 text-center sm:w-20">
                  <p className="text-xl font-extrabold sm:text-2xl">{exam.name}</p>
                  <p className="text-xs font-semibold text-white/90">2027</p>
                </div>

                <div className="grid min-w-0 flex-1 grid-cols-4 gap-1.5 sm:gap-2">
                  {values.map(({ label, value }) => (
                    <div key={label} className="min-w-0 text-center">
                      <div
                        className={`flex h-12 items-center justify-center rounded-xl bg-white px-1 text-xl font-extrabold tabular-nums sm:h-14 sm:text-2xl ${exam.numberColor}`}
                      >
                        {value === undefined ? "--" : String(value).padStart(2, "0")}
                      </div>
                      <p className="mt-1 text-xs font-medium">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              {left?.isFinished && (
                <p className="mt-3 text-center text-xs font-medium">
                  Đã đến mốc thời gian đang cấu hình
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
