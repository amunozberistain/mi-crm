import PresupuestoClient from './presupuesto-client'

export default function PresupuestoPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Presupuesto IA</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Pega la transcripción de una reunión y Claude generará un presupuesto editable listo para PDF
        </p>
      </div>
      <PresupuestoClient />
    </div>
  )
}
