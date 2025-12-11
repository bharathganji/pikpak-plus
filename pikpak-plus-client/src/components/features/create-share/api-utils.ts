import axios from "axios";
import { getApiUrl } from "@/lib/api-utils";
import type { ConfigResponse } from "@/types";

export const fetchConfig = async (): Promise<ConfigResponse> => {
  try {
    const apiUrl = getApiUrl();
    const res = await axios.get(`${apiUrl}/config`);
    return res.data;
  } catch (error: any) {
    console.error("Failed to fetch config", error);
    // Return default values if config fetch fails
    return {
      max_file_size_gb: 25,
      task_status_update_interval_minutes: 15,
      next_task_status_update: null,
    };
  }
};

export const fetchCleanupStatus = async () => {
  try {
    const apiUrl = getApiUrl();
    const res = await axios.get(`${apiUrl}/cleanup/status`);
    return res.data;
  } catch (error: any) {
    console.error("Failed to fetch cleanup status", error);
    // Return null if cleanup status fetch fails
    return null;
  }
};

const DUMMY_TASKS = {
  count: 318,
  data: [
    {
      action: "add",
      created_at: "2025-12-10T15:42:57.540909+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T23:42:57.365+08:00",
            file_id: "VOg7vVp_drq4PQcU5-JoZc7_o2",
            file_name: "DorcelClub.25.10.03.Eve.Sweet.XXX.2160p.MP4-NBQ[XC]",
            file_size: "3639658912",
            icon_link: "",
            id: "VOg7vVpKdrq4PQcU5-JoZc7Zo2",
            kind: "drive#task",
            message: "34 B not saved successfully",
            name: "DorcelClub.25.10.03.Eve.Sweet.XXX.2160p.MP4-NBQ[XC]",
            params: {
              predict_speed: "73300775185",
              predict_type: "3",
            },
            phase: "PHASE_TYPE_COMPLETE",
            progress: 100,
            space: "",
            status_size: 2,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T23:42:59.590+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:d08db4a4fdc9f73dd4ae56773ca7128d631af572&dn=DorcelClub.25.10.03.Eve.Sweet.XXX.2160p.MP4-NBQ%5BXC%5D&tr=udp://tracker.openbittorrent.com:80&tr=udp://tracker.opentrackr.org:1337/announce",
      },
      id: 1291,
    },
    {
      action: "add",
      created_at: "2025-12-10T15:32:10.919115+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T23:32:10.764+08:00",
            file_id: "VOg7t1yYi1385s3Br1iOXLMHo2",
            file_name:
              "Beauty.and.the.Beast.2017.1080p.10bit.BluRay.8CH.x265.HEVC-PSA",
            file_size: "2623032565",
            icon_link: "",
            id: "VOg7t1yBi1385s3Br1iOXLMGo2",
            kind: "drive#task",
            message: "33 B not saved successfully",
            name: "Beauty.and.the.Beast.2017.1080p.10bit.BluRay.8CH.x265.HEVC-PSA",
            params: {
              predict_speed: "73300775185",
              predict_type: "3",
            },
            phase: "PHASE_TYPE_COMPLETE",
            progress: 100,
            space: "",
            status_size: 3,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T23:32:13.278+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:E3106CDFD04A6D00456838A92EEFA25B70E4F1D6&dn=Beauty.and.the.Beast.2017.1080p.10bit.BluRay.8CH.x265.HEVC-PSA&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.sktorrent.net%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.zer0day.to%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.pirateparty.gr%3A6969%2Fannounce&tr=udp%3A%2F%2Foscar.reyesleon.xyz%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=http%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Fopentracker.i2p.rocks%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Fcoppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.zer0day.to%3A1337%2Fannounce",
      },
      id: 1290,
    },
    {
      action: "add",
      created_at: "2025-12-10T15:27:17.277895+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T23:27:17.144+08:00",
            file_id: "VOg7rvHgV59W9qeuc5Ve-vJ3o2",
            file_name: "ssis-444-4k",
            file_size: "28793411825",
            icon_link: "",
            id: "VOg7rvHNV59W9qeuc5Ve-vIzo2",
            kind: "drive#task",
            message: "522 B not saved successfully",
            name: "ssis-444-4k",
            params: {
              predict_speed: "73300775185",
              predict_type: "3",
            },
            phase: "PHASE_TYPE_COMPLETE",
            progress: 100,
            space: "",
            status_size: 6,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T23:27:22.465+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:f945be0e516d07e6731676d182ba881f6366adee&dn=ssis-444-4k&tr=http%3a%2f%2fsukebei.tracker.wf%3a8888%2fannounce&tr=udp%3a%2f%2f9.rarbg.com%3a2710%2fannounce&tr=udp%3a%2f%2fpublic.popcorn-tracker.org%3a6969%2fannounce&tr=udp%3a%2f%2f182.176.139.129%3a6969%2fannounce&tr=http%3a%2f%2f5.79.83.193%3a2710%2fannounce&tr=udp%3a%2f%2f91.218.230.81%3a6969%2fannounce&tr=udp%3a%2f%2fmgtracker.org%3a2710%2fannounce&tr=http%3a%2f%2fmgtracker.org%3a6969%2fannounce&tr=http%3a%2f%2ftracker1.wasabii.com.tw%3a6969%2fannounce&tr=http%3a%2f%2ftracker2.itzmx.com%3a6961%2fannounce&tr=udp%3a%2f%2f62.138.0.158%3a6969%2fannounce&tr=udp%3a%2f%2feddie4.nl%3a6969%2fannounce&tr=udp%3a%2f%2fshadowshq.eddie4.nl%3a6969%2fannounce&tr=udp%3a%2f%2fshadowshq.yi.org%3a6969%2fannounce&tr=udp%3a%2f%2ftracker.eddie4.nl%3a6969%2fannounce&tr=udp%3a%2f%2ftracker.mg64.net%3a2710%2fannounce&tr=udp%3a%2f%2ftracker.mg64.net%3a6969%2fannounce&tr=udp%3a%2f%2fbt.xxx-tracker.com%3a2710%2fannounce&tr=http%3a%2f%2ftracker.mg64.net%3a6881%2fannounce&tr=udp%3a%2f%2ftracker.opentrackr.org%3a1337%2fannounce&tr=udp%3a%2f%2ftracker.coppersurfer.tk%3a6969%2fannounce&tr=udp%3a%2f%2ftracker.leechers-paradise.org%3a6969%2fannounce&tr=udp%3a%2f%2f9.rarbg.com%3a2730%2fannounce&tr=udp%3a%2f%2ftracker.internetwarriors.net%3a1337%2fannounce&tr=udp%3a%2f%2ftracker.tiny-vps.com%3a6969%2fannounce&tr=http%3a%2f%2ftracker.internetwarriors.net%3a1337%2fannounce&tr=http%3a%2f%2fmgtracker.org%3a2710%2fannounce&tr=http%3a%2f%2f91.218.230.81%3a6969%2fannounce&tr=http%3a%2f%2f182.176.139.129%3a6969%2fannounce&tr=http%3a%2f%2fopen.acgtracker.com%3a1096%2fannounce&tr=udp%3a%2f%2fopen.stealth.si%3a80%2fannounce&tr=udp%3a%2f%2f151.80.120.114%3a2710%2fannounce&tr=http%3a%2f%2f210.244.71.25%3a6969%2fannounce&tr=udp%3a%2f%2f5.79.249.77%3a6969%2fannounce&tr=http%3a%2f%2f173.254.204.71%3a1096%2fannounce&tr=udp%3a%2f%2fexodus.desync.com%3a6969%2fannounce&tr=udp%3a%2f%2ftracker.torrent.eu.org%3a451%2fannounce",
      },
      id: 1289,
    },
    {
      action: "add",
      created_at: "2025-12-10T15:12:37.82933+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T23:12:37.619+08:00",
            file_id: "VOg7oZZ3SUQ0g-iUSRQOAwexo2",
            file_name: "Weak Hero Class 2",
            file_size: "9680201152",
            icon_link: "",
            id: "VOg7oZYnSUQ0g-iUSRQOAwewo2",
            kind: "drive#task",
            message: "Saved",
            name: "Weak Hero Class 2",
            params: {
              predict_speed: "73300775185",
              predict_type: "3",
            },
            phase: "PHASE_TYPE_COMPLETE",
            progress: 100,
            space: "",
            status_size: 8,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T23:12:40.561+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:34affccba20dcdf67a77f90999c73d2d1e1408de&dn=Weak+Hero+Class+2&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.tracker.cl%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.com%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Fopen.dstud.io%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.ololosh.space%3A6969%2Fannounce&tr=udp%3A%2F%2Fexplodie.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker-udp.gbitt.info%3A80%2Fannounce",
      },
      id: 1287,
    },
    {
      action: "add",
      created_at: "2025-12-10T15:07:24.263719+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T23:07:24.155+08:00",
            file_id: "",
            file_name:
              "Baby Driver 2017 (1080p Bluray x265 HEVC 10bit AAC 5.1 Tigole)",
            file_size: "4991144517",
            icon_link: "",
            id: "VOg7nN0vX53zbFLo8Wb0S8HFo2",
            kind: "drive#task",
            message: "Saving",
            name: "Baby Driver 2017 (1080p Bluray x265 HEVC 10bit AAC 5.1 Tigole)",
            params: {
              predict_speed: "",
              predict_type: "1",
            },
            phase: "PHASE_TYPE_RUNNING",
            progress: 92,
            space: "",
            status_size: 15,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-11T11:45:03.153+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:816731A89BBF03AA6DA4C9254214F4FECFE3B145&dn=Baby+Driver+2017+%281080p+Bluray+x265+HEVC+10bit+AAC+5+1+Tigole%29+%5BUTR%5D&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Ftracker.mg64.net%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451&tr=udp%3A%2F%2F9.rarbg.me%3A2740%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2730%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2770%2Fannounce&tr=udp%3A%2F%2Ftracker.tiny-vps.com%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2740%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2730%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2770%2Fannounce&tr=udp%3A%2F%2Ftracker.pirateparty.gr%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2720%2Fannounce&tr=udp%3A%2F%2Ftracker.port443.xyz%3A6969%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=http%3A%2F%2Fbigfoot1942.sektori.org%3A6969%2Fannounce&tr=udp%3A%2F%2Fshadowshq.yi.org%3A6969%2Fannounce&tr=udp%3A%2F%2Feddie4.nl%3A6969%2Fannounce&tr=udp%3A%2F%2Fthetracker.org%3A80%2Fannounce&tr=http%3A%2F%2Fshare.camoe.cn%3A8080%2Fannounce&tr=udp%3A%2F%2Ftracker.justseed.it%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A80%2Fannounce&tr=udp%3A%2F%2Fipv6.tracker.harry.lu%3A80%2Fannounce&tr=udp%3A%2F%2Fbt.xxx-tracker.com%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.com%3A1337%2Fannounce&tr=udp%3A%2F%2Fexplodie.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.ololosh.space%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.dump.cl%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.bittor.pw%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker-udp.gbitt.info%3A80%2Fannounce&tr=udp%3A%2F%2Fretracker01-msk-virt.corbina.net%3A80%2Fannounce&tr=udp%3A%2F%2Fopen.free-tracker.ga%3A6969%2Fannounce&tr=udp%3A%2F%2Fns-1.x-fins.com%3A6969%2Fannounce&tr=udp%3A%2F%2Fleet-tracker.moe%3A1337%2Fannounce&tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.open-internet.nl%3A6969%2Fannounce&tr=udp%3A%2F%2Fdenis.stalker.upeer.me%3A6969%2Fannounce",
      },
      id: 1286,
    },
    {
      action: "add",
      created_at: "2025-12-10T15:07:11.610624+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T23:07:11.532+08:00",
            file_id: "",
            file_name:
              "[ANi] \u5996\u602a\u65c5\u9928\u71df\u696d\u4e2d \u8cb3 - 11 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4",
            file_size: "277889758",
            icon_link: "",
            id: "VOg7nJwgs_heSfqlyRVD5MkGo2",
            kind: "drive#task",
            message: "Saved",
            name: "[ANi] \u5996\u602a\u65c5\u9928\u71df\u696d\u4e2d \u8cb3 - 11 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4",
            params: {
              predict_speed: "",
              predict_type: "1",
            },
            phase: "PHASE_TYPE_COMPLETE",
            progress: 100,
            space: "",
            status_size: 1,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T23:20:30.915+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:f6583b2f62c6b2a74187ad77678218628c3b06bc&dn=%5BANi%5D%20Kakuriyo%20Bed%20%20Breakfast%20for%20Spirits%20%2F%20%20%E5%A6%96%E6%80%AA%E6%97%85%E9%A4%A8%E7%87%9F%E6%A5%AD%E4%B8%AD%20%E8%B2%B3%20-%2011%20%5B1080P%5D%5BBaha%5D%5BWEB-DL%5D%5BAAC%20AVC%5D%5BCHT%5D%5BMP4%5D&tr=http%3A%2F%2Fnyaa.tracker.wf%3A7777%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce",
      },
      id: 1285,
    },
    {
      action: "add",
      created_at: "2025-12-10T15:07:08.022713+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T23:07:07.854+08:00",
            file_id: "VOg7nJ2YLaTM2V5V7QKM2sxfo2",
            file_name:
              "www.1TamilMV.pink - Boys (2003) Tamil TRUE WEB-DL - 1080p - AVC - (DTS5.1 - 754Kbps & AAC 2.0) - 8.2GB - ESub.mkv",
            file_size: "8744085651",
            icon_link: "",
            id: "VOg7nJ2DLaTM2V5V7QKM2sxeo2",
            kind: "drive#task",
            message: "Saved",
            name: "www.1TamilMV.pink - Boys (2003) Tamil TRUE WEB-DL - 1080p - AVC - (DTS5.1 - 754Kbps & AAC 2.0) - 8.2GB - ESub.mkv",
            params: {
              predict_speed: "73300775185",
              predict_type: "3",
            },
            phase: "PHASE_TYPE_COMPLETE",
            progress: 100,
            space: "",
            status_size: 1,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T23:07:10.355+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:5c196cc09fb1f71128d70aad7fea0c80d0cf047e&dn=www.1TamilMV.pink%20-%20Boys%20%282003%29%20Tamil%20TRUE%20WEB-DL%20-%201080p%20-%20AVC%20-%20%28DTS5.1%20-%20754Kbps%20%26%20AAC%202.0%29%20-%208.2GB%20-%20ESub.mkv&xl=8744085651&tr=http%3A%2F%2F91.217.91.21%3A3218%2Fannounce&tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=http%3A%2F%2Fpow7.com%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.tiny-vps.com%3A6969%2Fannounce&tr=http%3A%2F%2Ftracker.tvunderground.org.ru%3A3218%2Fannounce&tr=udp%3A%2F%2Ftracker.yoshi210.com%3A6969%2Fannounce&tr=http%3A%2F%2Ftracker2.itzmx.com%3A6961%2Fannounce&tr=udp%3A%2F%2F151.80.120.114%3A2710%2Fannounce&tr=udp%3A%2F%2F62.138.0.158%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.com%3A2790%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2720%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2740%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=http%3A%2F%2Ftracker.yoshi210.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.pirateparty.gr%3A6969%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.si%3A1337%2Fannounce&tr=udp%3A%2F%2Fdenis.stalker.upeer.me%3A6969%2Fannounce&tr=http%3A%2F%2Ft.nyaatracker.com%3A80%2Fannounce",
      },
      id: 1284,
    },
    {
      action: "add",
      created_at: "2025-12-10T15:04:55.067081+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T23:04:54.914+08:00",
            file_id: "",
            file_name:
              "www.5MovieRulz.condos - Iru Dhuruvam 2 (2023) 1080p S02 EP (01-10) WEB-DL - AVC - [Tel + Tam + Hin + Mal + Kan]",
            file_size: "6099158595",
            icon_link: "",
            id: "VOg7mna1s_heSfqlyRVD5HO2o2",
            kind: "drive#task",
            message: "Saving",
            name: "www.5MovieRulz.condos - Iru Dhuruvam 2 (2023) 1080p S02 EP (01-10) WEB-DL - AVC - [Tel + Tam + Hin + Mal + Kan]",
            params: {
              predict_speed: "",
              predict_type: "1",
            },
            phase: "PHASE_TYPE_RUNNING",
            progress: 99,
            space: "",
            status_size: 19,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T23:04:57.140+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:980917ec95008319e5d9d1ccf8b2c88c7eefcfe4&dn=www.5MovieRulz.condos%20-%20Iru%20Dhuruvam%202%20(2023)%201080p%20S02%20EP%20(01-10)%20WEB-DL%20-%20AVC%20-%20%5bTel%20%2b%20Tam%20%2b%20Hin%20%2b%20Mal%20%2b%20Kan%5d&tr=udp%3a%2f%2ftracker.opentrackr.org%3a1337%2fannounce&tr=udp%3a%2f%2fopen.demonii.com%3a1337%2fannounce&tr=udp%3a%2f%2fopen.tracker.cl%3a1337%2fannounce&tr=udp%3a%2f%2fopen.stealth.si%3a80%2fannounce&tr=udp%3a%2f%2ftracker.torrent.eu.org%3a451%2fannounce&tr=udp%3a%2f%2ftracker.ololosh.space%3a6969%2fannounce&tr=udp%3a%2f%2ftracker.dump.cl%3a6969%2fannounce&tr=udp%3a%2f%2ftracker.bittor.pw%3a1337%2fannounce&tr=udp%3a%2f%2fopentracker.io%3a6969%2fannounce&tr=udp%3a%2f%2fisk.richardsw.club%3a6969%2fannounce&tr=udp%3a%2f%2fdiscord.heihachi.pw%3a6969%2fannounce&tr=http%3a%2f%2fwww.torrentsnipe.info%3a2701%2fannounce&tr=http%3a%2f%2ftracker810.xyz%3a11450%2fannounce&tr=http%3a%2f%2ftracker.vanitycore.co%3a6969%2fannounce&tr=http%3a%2f%2ftracker.sbsub.com%3a2710%2fannounce&tr=http%3a%2f%2ftracker.moxing.party%3a6969%2fannounce&tr=http%3a%2f%2ftracker.lintk.me%3a2710%2fannounce",
      },
      id: 1283,
    },
    {
      action: "add",
      created_at: "2025-12-10T15:04:38.725777+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T23:04:38.601+08:00",
            file_id: "",
            file_name:
              "www.5MovieRulz.condos - Iru Dhuruvam (2019) 1080p S01 - EP(01-09) WEB-DL - AVC - \u00a0[Tel + Tam + Hin]",
            file_size: "7191996393",
            icon_link: "",
            id: "VOg7mjb8s_heSfqlyRVD5GSBo2",
            kind: "drive#task",
            message: "Saving",
            name: "www.5MovieRulz.condos - Iru Dhuruvam (2019) 1080p S01 - EP(01-09) WEB-DL - AVC - \u00a0[Tel + Tam + Hin]",
            params: {
              predict_speed: "",
              predict_type: "1",
            },
            phase: "PHASE_TYPE_RUNNING",
            progress: 99,
            space: "",
            status_size: 17,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T23:04:40.131+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:6757a774c05a5571fdc82613238da2628b38cca5&dn=www.5MovieRulz.condos%20-%20Iru%20Dhuruvam%20(2019)%201080p%20S01%20-%20EP(01-09)%20WEB-DL%20-%20AVC%20-%20%c2%a0%5bTel%20%2b%20Tam%20%2b%20Hin%5d&tr=udp%3a%2f%2ftracker.opentrackr.org%3a1337%2fannounce&tr=udp%3a%2f%2fopen.demonii.com%3a1337%2fannounce&tr=udp%3a%2f%2fopen.tracker.cl%3a1337%2fannounce&tr=udp%3a%2f%2fopen.stealth.si%3a80%2fannounce&tr=udp%3a%2f%2ftracker.torrent.eu.org%3a451%2fannounce&tr=udp%3a%2f%2ftracker.ololosh.space%3a6969%2fannounce&tr=udp%3a%2f%2ftracker.dump.cl%3a6969%2fannounce&tr=udp%3a%2f%2ftracker.bittor.pw%3a1337%2fannounce&tr=udp%3a%2f%2fopentracker.io%3a6969%2fannounce&tr=udp%3a%2f%2fisk.richardsw.club%3a6969%2fannounce&tr=udp%3a%2f%2fdiscord.heihachi.pw%3a6969%2fannounce&tr=http%3a%2f%2fwww.torrentsnipe.info%3a2701%2fannounce&tr=http%3a%2f%2ftracker810.xyz%3a11450%2fannounce&tr=http%3a%2f%2ftracker.vanitycore.co%3a6969%2fannounce&tr=http%3a%2f%2ftracker.sbsub.com%3a2710%2fannounce&tr=http%3a%2f%2ftracker.moxing.party%3a6969%2fannounce&tr=http%3a%2f%2ftracker.lintk.me%3a2710%2fannounce",
      },
      id: 1282,
    },
    {
      action: "add",
      created_at: "2025-12-10T15:02:59.138732+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T23:02:58.947+08:00",
            file_id: "VOg7mMHQSUQ0g-iUSRQOAOsDo2",
            file_name: "[Moozzi2] Ganbatte Ikimasshoi [ 4K Ver. ] - Movie",
            file_size: "12906281792",
            icon_link: "",
            id: "VOg7mMH2SUQ0g-iUSRQOAOs1o2",
            kind: "drive#task",
            message: "105 B not saved successfully",
            name: "[Moozzi2] Ganbatte Ikimasshoi [ 4K Ver. ] - Movie",
            params: {
              predict_speed: "73300775185",
              predict_type: "3",
            },
            phase: "PHASE_TYPE_COMPLETE",
            progress: 100,
            space: "",
            status_size: 2,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T23:03:04.245+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:SDXMTQIAGE24IILQ66WOVDFS4JOALK2Z&dn=%5BMoozzi2%5D%20Ganbatte%20Ikimasshoi%20%5B%204K%20Ver.%20%5D%20-%20Movie&tr.1=http%3A%2F%2Fnyaa.tracker.wf%3A7777%2Fannounce&tr.2=http%3A%2F%2Fnyaa.tracker.wf%3A7777%2Fannounce&tr.3=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr.4=udp%3A%2F%2Fopen.demonii.com%3A1337%2Fannounce&tr.5=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr.6=udp%3A%2F%2Ftracker.tiny-vps.com%3A6969%2Fannounce&tr.7=udp%3A%2F%2Ftracker.dler.org%3A6969%2Fannounce&tr.8=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr.9=https%3A%2F%2Ftracker.nanoha.org%3A443%2Fannounce&tr.10=https%3A%2F%2Ftracker.lilithraws.org%3A443%2Fannounce&tr.11=http%3A%2F%2Ftracker.mywaifu.best%3A6969%2Fannounce",
      },
      id: 1281,
    },
    {
      action: "add",
      created_at: "2025-12-10T14:57:49.699138+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T22:57:49.500+08:00",
            file_id: "VOg7lAjKeHaFBHKca-HXEU-ro2",
            file_name:
              "www.UIndex.org    -    Landman S02E03 Almost a Home 2160p AMZN WEB-DL DD 5 1 H 265-playWEB",
            file_size: "5956894810",
            icon_link: "",
            id: "VOg7lAiweHaFBHKca-HXEU-fo2",
            kind: "drive#task",
            message: "988 B not saved successfully",
            name: "www.UIndex.org    -    Landman S02E03 Almost a Home 2160p AMZN WEB-DL DD 5 1 H 265-playWEB",
            params: {
              predict_speed: "73300775185",
              predict_type: "3",
            },
            phase: "PHASE_TYPE_COMPLETE",
            progress: 100,
            space: "",
            status_size: 3,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T22:57:51.917+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:89023AD384B810B4302E43A6D906352CD76FAD21",
      },
      id: 1280,
    },
    {
      action: "add",
      created_at: "2025-12-10T14:46:51.597204+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T22:46:51.491+08:00",
            file_id: "",
            file_name:
              "www.5MovieRulz.condos - Real Kashmir Football Club (2025) 1080p S01 EP (01-08) TRUE WEB-DL - AVC - [Tel + Tam + Hin + Mal]",
            file_size: "11103176293",
            icon_link: "",
            id: "VOg7if4Yu8xhZ87X1Utktubwo2",
            kind: "drive#task",
            message: "Saving",
            name: "www.5MovieRulz.condos - Real Kashmir Football Club (2025) 1080p S01 EP (01-08) TRUE WEB-DL - AVC - [Tel + Tam + Hin + Mal]",
            params: {
              predict_speed: "",
              predict_type: "1",
            },
            phase: "PHASE_TYPE_RUNNING",
            progress: 99,
            space: "",
            status_size: 15,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T22:46:52.809+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:3005331aa3fc95f141757ac85421b4d0fe1e5077&dn=www.5MovieRulz.condos%20-%20Real%20Kashmir%20Football%20Club%20(2025)%201080p%20S01%20EP%20(01-08)%20TRUE%20WEB-DL%20-%20AVC%20-%20%5bTel%20%2b%20Tam%20%2b%20Hin%20%2b%20Mal%5d&tr=udp%3a%2f%2ftracker.opentrackr.org%3a1337%2fannounce&tr=udp%3a%2f%2fopen.demonii.com%3a1337%2fannounce&tr=udp%3a%2f%2fopen.tracker.cl%3a1337%2fannounce&tr=udp%3a%2f%2fopen.stealth.si%3a80%2fannounce&tr=udp%3a%2f%2ftracker.torrent.eu.org%3a451%2fannounce&tr=udp%3a%2f%2ftracker.ololosh.space%3a6969%2fannounce&tr=udp%3a%2f%2ftracker.dump.cl%3a6969%2fannounce&tr=udp%3a%2f%2ftracker.bittor.pw%3a1337%2fannounce&tr=udp%3a%2f%2fopentracker.io%3a6969%2fannounce&tr=udp%3a%2f%2fisk.richardsw.club%3a6969%2fannounce&tr=udp%3a%2f%2fdiscord.heihachi.pw%3a6969%2fannounce&tr=http%3a%2f%2fwww.torrentsnipe.info%3a2701%2fannounce&tr=http%3a%2f%2ftracker810.xyz%3a11450%2fannounce&tr=http%3a%2f%2ftracker.vanitycore.co%3a6969%2fannounce&tr=http%3a%2f%2ftracker.sbsub.com%3a2710%2fannounce&tr=http%3a%2f%2ftracker.moxing.party%3a6969%2fannounce&tr=http%3a%2f%2ftracker.lintk.me%3a2710%2fannounce",
      },
      id: 1279,
    },
    {
      action: "add",
      created_at: "2025-12-10T14:33:17.750642+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T22:33:17.643+08:00",
            file_id: "",
            file_name:
              "www.5MovieRulz.condos - Brinda (2024) 1080p S01 EP (01-08) - HQ HDRip - [Tel + Tam\u00a0+ Hin + Mal + Kan]",
            file_size: "1921168673",
            icon_link: "",
            id: "VOg7fZOAs_heSfqlyRVD3NBNo2",
            kind: "drive#task",
            message: "Saved",
            name: "www.5MovieRulz.condos - Brinda (2024) 1080p S01 EP (01-08) - HQ HDRip - [Tel + Tam\u00a0+ Hin + Mal + Kan]",
            params: {
              predict_speed: "",
              predict_type: "1",
            },
            phase: "PHASE_TYPE_COMPLETE",
            progress: 100,
            space: "",
            status_size: 1,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T23:21:10.000+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:676dd61419b6b842b515dc7367e2c7cf65b7c03a&dn=www.5MovieRulz.condos%20-%20Brinda%20(2024)%201080p%20S01%20EP%20(01-08)%20-%20HQ%20HDRip%20-%20%5bTel%20%2b%20Tam%c2%a0%2b%20Hin%20%2b%20Mal%20%2b%20Kan%5d&tr=udp%3a%2f%2ftracker.opentrackr.org%3a1337%2fannounce&tr=udp%3a%2f%2fopen.demonii.com%3a1337%2fannounce&tr=udp%3a%2f%2fopen.tracker.cl%3a1337%2fannounce&tr=udp%3a%2f%2fopen.stealth.si%3a80%2fannounce&tr=udp%3a%2f%2ftracker.torrent.eu.org%3a451%2fannounce&tr=udp%3a%2f%2ftracker.ololosh.space%3a6969%2fannounce&tr=udp%3a%2f%2ftracker.dump.cl%3a6969%2fannounce&tr=udp%3a%2f%2ftracker.bittor.pw%3a1337%2fannounce&tr=udp%3a%2f%2fopentracker.io%3a6969%2fannounce&tr=udp%3a%2f%2fisk.richardsw.club%3a6969%2fannounce&tr=udp%3a%2f%2fdiscord.heihachi.pw%3a6969%2fannounce&tr=http%3a%2f%2fwww.torrentsnipe.info%3a2701%2fannounce&tr=http%3a%2f%2ftracker810.xyz%3a11450%2fannounce&tr=http%3a%2f%2ftracker.vanitycore.co%3a6969%2fannounce&tr=http%3a%2f%2ftracker.sbsub.com%3a2710%2fannounce&tr=http%3a%2f%2ftracker.moxing.party%3a6969%2fannounce&tr=http%3a%2f%2ftracker.lintk.me%3a2710%2fannounce",
      },
      id: 1278,
    },
    {
      action: "add",
      created_at: "2025-12-10T14:12:54.526856+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T22:12:54.422+08:00",
            file_id: "",
            file_name:
              "08.05.22.Tristan.and.Isolde.2006.HDDVD.REMUX.VC-1.1080p.DTS-HDMA.SiluHD",
            file_size: "23169850308",
            icon_link: "",
            id: "VOg7atkLi1385s3Br1iORrPvo2",
            kind: "drive#task",
            message: "Saving",
            name: "08.05.22.Tristan.and.Isolde.2006.HDDVD.REMUX.VC-1.1080p.DTS-HDMA.SiluHD",
            params: {
              predict_speed: "",
              predict_type: "1",
            },
            phase: "PHASE_TYPE_RUNNING",
            progress: 0,
            space: "",
            status_size: 10,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T22:12:54.475+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:2FE22DE8A50DCEAC3D5C7E8DC7C8326F5F0CD0DB&dn=08.05.22.Tristan.and.Isolde.2006.HDDVD.REMUX.VC-1.1080p.DTS-HDMA.SiluHD&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.tracker.cl%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.com%3A1337%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Fexodus.desync.com%3A6969%2Fannounce&tr=udp%3A%2F%2Fopen.dstud.io%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.ololosh.space%3A6969%2Fannounce&tr=udp%3A%2F%2Fexplodie.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker-udp.gbitt.info%3A80%2Fannounce",
      },
      id: 1277,
    },
    {
      action: "add",
      created_at: "2025-12-10T13:59:48.233334+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T21:59:48.036+08:00",
            file_id: "VOg7YtlHeHaFBHKca-HXAB-Ko2",
            file_name:
              "Silo (2023) S01 (1080p ATVP WEB-DL x265 10bit EAC3 5.1 Silence)",
            file_size: "17719047255",
            icon_link: "",
            id: "VOg7Ytl3eHaFBHKca-HXAB-Io2",
            kind: "drive#task",
            message: "Saved",
            name: "Silo (2023) S01 (1080p ATVP WEB-DL x265 10bit EAC3 5.1 Silence)",
            params: {
              predict_speed: "73300775185",
              predict_type: "3",
            },
            phase: "PHASE_TYPE_COMPLETE",
            progress: 100,
            space: "",
            status_size: 10,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T21:59:50.984+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:FAD97B8BF6A82BA6E060557191010B29D15FD605&dn=Silo+%282023%29+S01+%281080p+ATVP+WEB-DL+x265+10bit+EAC3+5.1+Silence%29+%5BQxR%5D&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Fwww.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Fopen.tracker.cl%3A1337%2Fannounce&tr=udp%3A%2F%2Fexplodie.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=http%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Fopentracker.i2p.rocks%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Fcoppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.zer0day.to%3A1337%2Fannounce",
      },
      id: 1276,
    },
    {
      action: "add",
      created_at: "2025-12-10T13:49:41.935573+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T21:49:41.803+08:00",
            file_id: "VOg7W_kzLaTM2V5V7QKLwu0Mo2",
            file_name:
              "John Wick - Chapter 4 (2023) (2160p BluRay x265 10bit HDR Tigole).mkv",
            file_size: "16120412876",
            icon_link: "",
            id: "VOg7W_kfLaTM2V5V7QKLwu0Lo2",
            kind: "drive#task",
            message: "Saved",
            name: "John Wick - Chapter 4 (2023) (2160p BluRay x265 10bit HDR Tigole).mkv",
            params: {
              predict_speed: "73300775185",
              predict_type: "3",
            },
            phase: "PHASE_TYPE_COMPLETE",
            progress: 100,
            space: "",
            status_size: 1,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T21:49:47.151+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:84A138C9E07B546643DD23FFB57457A49CDCECD0&dn=John+Wick+-+Chapter+4+%282023%29+%282160p+BluRay+x265+HEVC+10bit+HDR+AAC+7.1+Tigole%29+%5BQxR%5D&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=http%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Fopentracker.i2p.rocks%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Fcoppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.zer0day.to%3A1337%2Fannounce",
      },
      id: 1275,
    },
    {
      action: "add",
      created_at: "2025-12-10T13:34:04.436645+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T21:34:04.174+08:00",
            file_id: "VOg7T-qiSUQ0g-iUSRQO3-1Oo2",
            file_name:
              "Deeper.24.02.22.Rissa.May.And.Melanie.Marie.XXX.1080p.MP4-NBQ[XvX]",
            file_size: "3816806836",
            icon_link: "",
            id: "VOg7T-qDSUQ0g-iUSRQO3-1Bo2",
            kind: "drive#task",
            message: "718 B not saved successfully",
            name: "Deeper.24.02.22.Rissa.May.And.Melanie.Marie.XXX.1080p.MP4-NBQ[XvX]",
            params: {
              predict_speed: "73300775185",
              predict_type: "3",
            },
            phase: "PHASE_TYPE_COMPLETE",
            progress: 100,
            space: "",
            status_size: 2,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T21:34:06.461+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:E346DD8B5192CBD1B51EEA713E4AFC7BED0E6AF0&dn=Deeper.24.02.22.Rissa.May.And.Melanie.Marie.XXX.1080p.MP4-NBQ%5BXvX%5D&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.tiny-vps.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Fexplodie.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce&tr=udp%3A%2F%2Fipv4.tracker.harry.lu%3A80%2Fannounce&tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.birkenwald.de%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.moeking.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fopentor.org%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.dler.org%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2970%2Fannounce&tr=https%3A%2F%2Ftracker.foreverpirates.co%3A443%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=http%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Fopentracker.i2p.rocks%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Fcoppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.zer0day.to%3A1337%2Fannounce",
      },
      id: 1274,
    },
    {
      action: "add",
      created_at: "2025-12-10T13:25:13.988153+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T21:25:13.846+08:00",
            file_id: "VOg7QzN7LaTM2V5V7QKLvGaxo2",
            file_name: "JUR-234.[4K]@R90s",
            file_size: "25152481075",
            icon_link: "",
            id: "VOg7QzMqLaTM2V5V7QKLvGaro2",
            kind: "drive#task",
            message: "File deleted",
            name: "JUR-234.[4K]@R90s",
            params: {
              predict_speed: "73300775185",
              predict_type: "3",
            },
            phase: "PHASE_TYPE_ERROR",
            progress: 100,
            space: "",
            status_size: 6,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T21:25:19.103+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:78ED252B611561F71D92FFDA845033686633A0C6&dn=JUR-234.%5B4K%5D%40R90s",
      },
      id: 1273,
    },
    {
      action: "add",
      created_at: "2025-12-10T13:07:38.318557+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T21:07:38.226+08:00",
            file_id: "",
            file_name: "ROE-215",
            file_size: "6537309222",
            icon_link: "",
            id: "VOg7Mxdmi1385s3Br1iOOAnho2",
            kind: "drive#task",
            message: "Saving",
            name: "ROE-215",
            params: {
              predict_speed: "",
              predict_type: "1",
            },
            phase: "PHASE_TYPE_RUNNING",
            progress: 99,
            space: "",
            status_size: 4,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T21:07:40.007+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:130E18CDA6ACEB6CC9AE833D4B2A114BD64FC746&size=6537309222&biz=ktr",
      },
      id: 1272,
    },
    {
      action: "add",
      created_at: "2025-12-10T12:58:11.424991+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T20:58:11.258+08:00",
            file_id: "VOg7KnEDezaYf_vrTrTxnZUeo2",
            file_name: "WAAA-569-C",
            file_size: "5833735910",
            icon_link: "",
            id: "VOg7KnDuezaYf_vrTrTxnZUbo2",
            kind: "drive#task",
            message: "File deleted",
            name: "WAAA-569-C",
            params: {
              predict_speed: "73300775185",
              predict_type: "3",
            },
            phase: "PHASE_TYPE_ERROR",
            progress: 100,
            space: "",
            status_size: 4,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T20:58:13.788+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:13208f0c99938b7a6b172fe9adcfa0679b22e6f9&dn=WAAA-569-C",
      },
      id: 1271,
    },
    {
      action: "add",
      created_at: "2025-12-10T12:07:24.233621+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T20:07:24.025+08:00",
            file_id: "VOg79AHBi1385s3Br1iOKB0eo2",
            file_name:
              "FreeUseMILF.22.05.08.Kendra.Heart.And.JC.Wilds.Giving.Him.A.Chance.XXX.1080p.HEVC.x265.PRT[XvX]",
            file_size: "854122282",
            icon_link: "",
            id: "VOg79AGti1385s3Br1iOKB0ao2",
            kind: "drive#task",
            message: "765 B not saved successfully",
            name: "FreeUseMILF.22.05.08.Kendra.Heart.And.JC.Wilds.Giving.Him.A.Chance.XXX.1080p.HEVC.x265.PRT[XvX]",
            params: {
              predict_speed: "73300775185",
              predict_type: "3",
            },
            phase: "PHASE_TYPE_COMPLETE",
            progress: 100,
            space: "",
            status_size: 3,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T20:07:26.600+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:3405CEAE1DE9569B4CF268FD99A0C0E425100C21&dn=FreeUseMILF.22.05.08.Kendra.Heart.And.JC.Wilds.Giving.Him.A.Chance.XXX.1080p.HEVC.x265.PRT%5BXvX%5D&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.tiny-vps.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Fexplodie.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce&tr=udp%3A%2F%2Fipv4.tracker.harry.lu%3A80%2Fannounce&tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.birkenwald.de%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.moeking.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fopentor.org%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.dler.org%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2970%2Fannounce&tr=https%3A%2F%2Ftracker.foreverpirates.co%3A443%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=http%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Fopentracker.i2p.rocks%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Fcoppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.zer0day.to%3A1337%2Fannounce",
      },
      id: 1260,
    },
    {
      action: "add",
      created_at: "2025-12-10T12:07:17.227522+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T20:07:17.110+08:00",
            file_id: "VOg798a5u8xhZ87X1UtkjSvpo2",
            file_name:
              "FreeUseFantasy.22.05.14.Alice.Visby.And.Dixie.Lynn.Naked.And.Viral.XXX.1080p.HEVC.x265.PRT[XvX]",
            file_size: "713211505",
            icon_link: "",
            id: "VOg798_qu8xhZ87X1UtkjSvmo2",
            kind: "drive#task",
            message: "765 B not saved successfully",
            name: "FreeUseFantasy.22.05.14.Alice.Visby.And.Dixie.Lynn.Naked.And.Viral.XXX.1080p.HEVC.x265.PRT[XvX]",
            params: {
              predict_speed: "73300775185",
              predict_type: "3",
            },
            phase: "PHASE_TYPE_COMPLETE",
            progress: 100,
            space: "",
            status_size: 3,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T20:07:19.371+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:8CDC6CE0C9B23DF76190D9556D0900D515E54679&dn=FreeUseFantasy.22.05.14.Alice.Visby.And.Dixie.Lynn.Naked.And.Viral.XXX.1080p.HEVC.x265.PRT%5BXvX%5D&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.tiny-vps.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Fexplodie.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce&tr=udp%3A%2F%2Fipv4.tracker.harry.lu%3A80%2Fannounce&tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.birkenwald.de%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.moeking.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fopentor.org%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.dler.org%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2970%2Fannounce&tr=https%3A%2F%2Ftracker.foreverpirates.co%3A443%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=http%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Fopentracker.i2p.rocks%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Fcoppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.zer0day.to%3A1337%2Fannounce",
      },
      id: 1259,
    },
    {
      action: "add",
      created_at: "2025-12-10T12:07:07.962551+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T20:07:07.834+08:00",
            file_id: "VOg796K7LaTM2V5V7QKLrBw2o2",
            file_name:
              "FreeUseFantasy.22.05.28.Eve.Marlow.And.Caitlin.Bell.Stretch.Your.Body.XXX.1080p.HEVC.x265.PRT[XvX]",
            file_size: "380917890",
            icon_link: "",
            id: "VOg796JuLaTM2V5V7QKLrBvyo2",
            kind: "drive#task",
            message: "765 B not saved successfully",
            name: "FreeUseFantasy.22.05.28.Eve.Marlow.And.Caitlin.Bell.Stretch.Your.Body.XXX.1080p.HEVC.x265.PRT[XvX]",
            params: {
              predict_speed: "73300775185",
              predict_type: "3",
            },
            phase: "PHASE_TYPE_COMPLETE",
            progress: 100,
            space: "",
            status_size: 3,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T20:07:11.168+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:1DEE6B4536D41DFD0246A9A3897BFF12F70F30F8&dn=FreeUseFantasy.22.05.28.Eve.Marlow.And.Caitlin.Bell.Stretch.Your.Body.XXX.1080p.HEVC.x265.PRT%5BXvX%5D&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.tiny-vps.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Fexplodie.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce&tr=udp%3A%2F%2Fipv4.tracker.harry.lu%3A80%2Fannounce&tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.birkenwald.de%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.moeking.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fopentor.org%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.dler.org%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2970%2Fannounce&tr=https%3A%2F%2Ftracker.foreverpirates.co%3A443%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=http%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Fopentracker.i2p.rocks%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Fcoppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.zer0day.to%3A1337%2Fannounce",
      },
      id: 1258,
    },
    {
      action: "add",
      created_at: "2025-12-10T12:07:04.197956+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T20:07:04.059+08:00",
            file_id: "VOg795PIu8xhZ87X1UtkjS_Fo2",
            file_name:
              "FreeUseFantasy.22.05.21.Lilith.Grace.And.Ryder.Rey.He.Always.Has.My.Back.XXX.1080p.HEVC.x265.PRT[XvX]",
            file_size: "856511272",
            icon_link: "",
            id: "VOg795Ovu8xhZ87X1UtkjS_Co2",
            kind: "drive#task",
            message: "765 B not saved successfully",
            name: "FreeUseFantasy.22.05.21.Lilith.Grace.And.Ryder.Rey.He.Always.Has.My.Back.XXX.1080p.HEVC.x265.PRT[XvX]",
            params: {
              predict_speed: "73300775185",
              predict_type: "3",
            },
            phase: "PHASE_TYPE_COMPLETE",
            progress: 100,
            space: "",
            status_size: 3,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T20:07:07.074+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:54DFF8A67F470FEA380BB3BE41F64DA45C914E7F&dn=FreeUseFantasy.22.05.21.Lilith.Grace.And.Ryder.Rey.He.Always.Has.My.Back.XXX.1080p.HEVC.x265.PRT%5BXvX%5D&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.tiny-vps.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Fexplodie.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce&tr=udp%3A%2F%2Fipv4.tracker.harry.lu%3A80%2Fannounce&tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.birkenwald.de%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.moeking.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fopentor.org%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.dler.org%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2970%2Fannounce&tr=https%3A%2F%2Ftracker.foreverpirates.co%3A443%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=http%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Fopentracker.i2p.rocks%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Fcoppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.zer0day.to%3A1337%2Fannounce",
      },
      id: 1257,
    },
    {
      action: "add",
      created_at: "2025-12-10T12:06:53.233032+00:00",
      data: {
        task: {
          task: {
            callback: "",
            created_time: "2025-12-10T20:06:52.999+08:00",
            file_id: "VOg792hTezaYf_vrTrTxl0-xo2",
            file_name:
              "FreeUseMILF.22.05.29.Stephanie.Love.Full.Body.Workout.XXX.1080p.HEVC.x265.PRT[XvX]",
            file_size: "669442358",
            icon_link: "",
            id: "VOg792h6ezaYf_vrTrTxl0-to2",
            kind: "drive#task",
            message: "765 B not saved successfully",
            name: "FreeUseMILF.22.05.29.Stephanie.Love.Full.Body.Workout.XXX.1080p.HEVC.x265.PRT[XvX]",
            params: {
              predict_speed: "73300775185",
              predict_type: "3",
            },
            phase: "PHASE_TYPE_COMPLETE",
            progress: 100,
            space: "",
            status_size: 3,
            statuses: [],
            third_task_id: "",
            type: "offline",
            updated_time: "2025-12-10T20:06:55.773+08:00",
            user_id: "aSmgJgNoiP8w0ZqR",
          },
          upload_type: "UPLOAD_TYPE_URL",
          url: {
            kind: "upload#url",
          },
        },
        url: "magnet:?xt=urn:btih:BD932DA5FA67B4C758CD6A4D969F0B796142438C&dn=FreeUseMILF.22.05.29.Stephanie.Love.Full.Body.Workout.XXX.1080p.HEVC.x265.PRT%5BXvX%5D&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.tiny-vps.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.torrent.eu.org%3A451%2Fannounce&tr=udp%3A%2F%2Fexplodie.org%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.cyberia.is%3A6969%2Fannounce&tr=udp%3A%2F%2Fipv4.tracker.harry.lu%3A80%2Fannounce&tr=udp%3A%2F%2Fp4p.arenabg.com%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.birkenwald.de%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.moeking.me%3A6969%2Fannounce&tr=udp%3A%2F%2Fopentor.org%3A2710%2Fannounce&tr=udp%3A%2F%2Ftracker.dler.org%3A6969%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2970%2Fannounce&tr=https%3A%2F%2Ftracker.foreverpirates.co%3A443%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce&tr=http%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2Fopentracker.i2p.rocks%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce&tr=udp%3A%2F%2Fcoppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.zer0day.to%3A1337%2Fannounce",
      },
      id: 1256,
    },
  ],
  limit: 25,
  page: 3,
};

export const fetchGlobalTasks = async (page: number, pageSize: number) => {
  try {
    const apiUrl = getApiUrl();
    // const res = await axios.get(`${apiUrl}/tasks`, {
    //   params: { page: page, limit: pageSize },
    // });
    return {
      data: DUMMY_TASKS.data || [],
      count: DUMMY_TASKS.count || 0,
    };
  } catch (error: any) {
    console.error("Failed to fetch global tasks", error);

    let msg = "Failed to load tasks";

    // Check if it's a network error (backend not running)
    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      msg = "Cannot connect to server. Please ensure the backend is running.";
    } else if (error.response?.data?.error) {
      msg = error.response.data.error;
    } else if (error.message) {
      msg = error.message;
    }

    throw new Error(msg);
  }
};

export const addMagnetLink = async (url: string) => {
  try {
    const apiUrl = getApiUrl();
    const res = await axios.post(`${apiUrl}/add`, { url: url.trim() });
    return res.data;
  } catch (error: any) {
    let errMsg = "Failed to add magnet link";

    // Check if it's a network error (backend not running)
    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      errMsg =
        "Cannot connect to server. Please ensure the backend is running.";
    } else if (error.response?.data?.error) {
      // API returned an error message
      errMsg = error.response.data.error;
    } else if (error.message) {
      // Other error with message
      errMsg = error.message;
    }

    // Add the response data to the error for file info
    (error as any).response = error.response;
    throw error;
  }
};

export const fetchMyTasks = async (urls: string[]) => {
  try {
    const apiUrl = getApiUrl();
    const res = await axios.post(`${apiUrl}/tasks/my-tasks`, { urls });
    return {
      data: res.data.data || [],
      count: res.data.count || 0,
    };
  } catch (error: any) {
    console.error("Failed to fetch my tasks", error);

    let msg = "Failed to load your tasks";

    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      msg = "Cannot connect to server. Please ensure the backend is running.";
    } else if (error.response?.data?.error) {
      msg = error.response.data.error;
    } else if (error.message) {
      msg = error.message;
    }

    throw new Error(msg);
  }
};
