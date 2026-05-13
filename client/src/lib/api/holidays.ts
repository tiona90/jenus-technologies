import apiClient from './client'
import type { HolidayCountry, PublicHoliday } from '../types'

export async function getHolidayCountries() {
    const response = await apiClient.get<HolidayCountry[]>('/holidays/countries')
    return response.data
}

export async function getHolidays(year: number) {
    const response = await apiClient.get<PublicHoliday[]>(`/holidays/${year}`)
    return response.data
}
