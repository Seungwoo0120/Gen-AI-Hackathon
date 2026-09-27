from datetime import datetime, timedelta, timezone

from app.adapters.ae.base import AeHospitalWaitTime, AeWaitTimesResponse, LocalizedText

HONG_KONG_TIMEZONE = timezone(timedelta(hours=8))


class MockAeWaitTimesSource:
    async def get_wait_times(self) -> AeWaitTimesResponse:
        source_updated_at = datetime(2026, 9, 27, 20, 0, tzinfo=HONG_KONG_TIMEZONE)
        return AeWaitTimesResponse(
            hospitals=[
                AeHospitalWaitTime(
                    hospital_id="prince-of-wales-hospital",
                    name=LocalizedText(en="Prince of Wales Hospital", zh_hant="威爾斯親王醫院"),
                    wait_time_text=LocalizedText(en="4 hours", zh_hant="4 小時"),
                    wait_minutes=240,
                ),
                AeHospitalWaitTime(
                    hospital_id="queen-elizabeth-hospital",
                    name=LocalizedText(en="Queen Elizabeth Hospital", zh_hant="伊利沙伯醫院"),
                    wait_time_text=LocalizedText(en="1.5 hours", zh_hant="1.5 小時"),
                    wait_minutes=90,
                ),
                AeHospitalWaitTime(
                    hospital_id="alice-ho-miu-ling-nethersole-hospital",
                    name=LocalizedText(
                        en="Alice Ho Miu Ling Nethersole Hospital",
                        zh_hant="雅麗氏何妙齡那打素醫院",
                    ),
                    wait_time_text=LocalizedText(en="Within 15 minutes", zh_hant="15 分鐘內"),
                    wait_minutes=15,
                ),
                AeHospitalWaitTime(
                    hospital_id="queen-mary-hospital",
                    name=LocalizedText(en="Queen Mary Hospital", zh_hant="瑪麗醫院"),
                    wait_time_text=LocalizedText(en="Around 2 hours", zh_hant="約 2 小時"),
                    wait_minutes=120,
                ),
                AeHospitalWaitTime(
                    hospital_id="caritas-medical-centre",
                    name=LocalizedText(en="Caritas Medical Centre", zh_hant="明愛醫院"),
                    wait_time_text=LocalizedText(
                        en="Waiting time temporarily unavailable",
                        zh_hant="等候時間暫未能提供",
                    ),
                ),
            ],
            source_updated_at=source_updated_at,
            fetched_at=source_updated_at,
            stale=False,
        )
