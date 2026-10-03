import * as signalR from "@microsoft/signalr";
import { API_BASE_URL } from "../api/api";

const connection = new signalR.HubConnectionBuilder()
  .withUrl(`${API_BASE_URL}/notificationHub`)
  .withAutomaticReconnect()
  .build();

export default connection;