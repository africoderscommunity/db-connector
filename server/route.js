import {  ipcMain } from 'electron'
import {  eventHandlers } from './services.js'



export const loadEventHandlers =(mainWindow)=>{
    eventHandlers(mainWindow).forEach((route)=>{
        ipcMain.handle(route.event,route.handler)
    })
}