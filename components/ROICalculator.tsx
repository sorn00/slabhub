'use client'

import { useState } from 'react'

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString()
}

export default function ROICalculator() {
  const [avgJobValue, setAvgJobValue] = useState(5000)
  const [closeRate, setCloseRate] = useState(55)
  const [appointments, setAppointments] = useState(4)

  const jobsClosed = appointments * (closeRate / 100)
  const revenue = jobsClosed * avgJobValue
  const cost = 300 + appointments * 150
  const netGain = revenue - cost
  const roi = (netGain / cost) * 100

  return (
    <section className="max-w-6xl mx-auto px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-3">See your ROI before you commit</h2>
          <p className="text-slate-400">Adjust the sliders to match your business</p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-8 md:p-10 space-y-8">
          {/* Sliders */}
          <div className="space-y-7">
            {/* Slider 1 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-slate-300 font-medium">Average job value</label>
                <span className="text-amber-400 font-bold text-lg">{fmt(avgJobValue)}</span>
              </div>
              <input
                type="range"
                min={1000}
                max={15000}
                step={500}
                value={avgJobValue}
                onChange={e => setAvgJobValue(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>$1,000</span>
                <span>$15,000</span>
              </div>
            </div>

            {/* Slider 2 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-slate-300 font-medium">Your close rate on appointments</label>
                <span className="text-amber-400 font-bold text-lg">{closeRate}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={90}
                step={5}
                value={closeRate}
                onChange={e => setCloseRate(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>20%</span>
                <span>90%</span>
              </div>
            </div>

            {/* Slider 3 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-slate-300 font-medium">Appointments from Quarriva per month</label>
                <span className="text-amber-400 font-bold text-lg">{appointments}</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                step={1}
                value={appointments}
                onChange={e => setAppointments(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1</span>
                <span>12</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700" />

          {/* Results */}
          <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Jobs closed</span>
              <span className="text-white font-semibold">{jobsClosed.toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Revenue added</span>
              <span className="text-white font-semibold">{fmt(revenue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Quarriva cost</span>
              <span className="text-white font-semibold">{fmt(cost)}/mo</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Net gain</span>
              <span className={netGain >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>{fmt(netGain)}</span>
            </div>
            <div className="border-t border-slate-700 pt-4 flex justify-between items-center">
              <span className="text-white font-bold text-lg">ROI</span>
              <span className="text-amber-400 font-bold text-3xl">{Math.round(roi)}%</span>
            </div>
          </div>

          <p className="text-slate-400 text-sm text-center italic">
            "You pay $150 per appointment — only when we deliver. One closed job covers your Quarriva costs for months."
          </p>
        </div>
      </div>
    </section>
  )
}
