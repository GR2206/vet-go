import type { Coord } from '@/lib/geo';

export type WalkSpot = {
  name: string;
  km: number;
  coordinate: Coord;
};

/** Parques y plazas de Rosario para el paseo del día. km se calcula con GPS. */
export const walkSpots: Omit<WalkSpot, 'km'>[] = [
  { name: 'Patio de la Madera', coordinate: { latitude: -32.9399, longitude: -60.6696 } },
  { name: 'Plaza Buratovich', coordinate: { latitude: -32.941, longitude: -60.6688 } },
  { name: 'Plaza Mariano Moreno', coordinate: { latitude: -32.9438, longitude: -60.6715 } },
  { name: 'Parque Independencia', coordinate: { latitude: -32.9578, longitude: -60.6589 } },
  { name: 'Parque Urquiza', coordinate: { latitude: -32.9545, longitude: -60.6295 } },
  { name: 'Costanera', coordinate: { latitude: -32.9386, longitude: -60.6328 } },
  { name: 'Paseo del Puerto', coordinate: { latitude: -32.9435, longitude: -60.6288 } },
  { name: 'Parque de España', coordinate: { latitude: -32.9372, longitude: -60.6508 } },
  { name: 'Bosque de los Constituyentes', coordinate: { latitude: -32.9254, longitude: -60.6848 } },
  { name: 'Parque Nacional a la Bandera', coordinate: { latitude: -32.9478, longitude: -60.6302 } },
  { name: 'Plaza 25 de Mayo', coordinate: { latitude: -32.947, longitude: -60.6362 } },
  { name: 'Plaza San Martín', coordinate: { latitude: -32.9474, longitude: -60.6406 } },
  { name: 'Plaza Pringles', coordinate: { latitude: -32.9472, longitude: -60.6448 } },
  { name: 'Plaza Sarmiento', coordinate: { latitude: -32.9512, longitude: -60.6414 } },
  { name: 'Plaza López', coordinate: { latitude: -32.9548, longitude: -60.6368 } },
  { name: 'Plaza Santa Rosa', coordinate: { latitude: -32.9506, longitude: -60.6378 } },
  { name: 'Plaza Libertad', coordinate: { latitude: -32.9526, longitude: -60.6452 } },
  { name: 'Plaza Montenegro', coordinate: { latitude: -32.9446, longitude: -60.6472 } },
  { name: 'Plaza La Paz', coordinate: { latitude: -32.9428, longitude: -60.6518 } },
  { name: 'Plaza 9 de Julio', coordinate: { latitude: -32.9448, longitude: -60.6525 } },
  { name: 'Plaza San José', coordinate: { latitude: -32.9485, longitude: -60.6558 } },
  { name: 'Plaza Wojtyla', coordinate: { latitude: -32.9455, longitude: -60.6565 } },
  { name: 'Plaza Echesortu', coordinate: { latitude: -32.9535, longitude: -60.658 } },
  { name: 'Parque de las Colectividades', coordinate: { latitude: -32.9288, longitude: -60.6548 } },
  { name: 'Puerto Norte', coordinate: { latitude: -32.9315, longitude: -60.6535 } },
  { name: 'Parque Norte', coordinate: { latitude: -32.9335, longitude: -60.6518 } },
  { name: 'Parque Sunchales', coordinate: { latitude: -32.9215, longitude: -60.6575 } },
  { name: 'Costanera Norte', coordinate: { latitude: -32.918, longitude: -60.662 } },
  { name: 'Parque Alem', coordinate: { latitude: -32.9088, longitude: -60.6785 } },
  { name: 'Plaza Alberdi', coordinate: { latitude: -32.9248, longitude: -60.6782 } },
  { name: 'Parque Scalabrini Ortiz', coordinate: { latitude: -32.9342, longitude: -60.7008 } },
  { name: 'Plaza Stella Maris', coordinate: { latitude: -32.9295, longitude: -60.7148 } },
  { name: 'Parque Oeste', coordinate: { latitude: -32.948, longitude: -60.712 } },
  { name: 'Parque Federico Palacios', coordinate: { latitude: -32.9148, longitude: -60.6945 } },
  { name: 'Parque Hipólito Yrigoyen', coordinate: { latitude: -32.9688, longitude: -60.6472 } },
  { name: 'Parque Regional Sur', coordinate: { latitude: -33.0045, longitude: -60.6388 } },
  { name: 'Parque de la Cabeza', coordinate: { latitude: -32.9562, longitude: -60.6285 } },
];
