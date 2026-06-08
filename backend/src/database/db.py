# src/database/db.py
import random
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from src.applications.types import StatusCode
from src.settings import settings

db_user = settings.db_user
db_password = settings.db_password
db_host = settings.db_host
db_port = settings.db_port
db_name = settings.db_name

DATABASE_URL = f"postgresql+psycopg://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    bind=engine,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Base(DeclarativeBase):
    pass


def create_db():
    with engine.connect() as conn:
        conn.execute(text("SET session_replication_role = 'replica';"))

        result = conn.execute(text("""
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public' 
            ORDER BY tablename;
        """))

        tables = [row[0] for row in result]

        for table in tables:
            try:
                conn.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE;'))
                print(f"Dropped table: {table}")
            except Exception as e:
                print(f"Warning: Could not drop table {table}: {e}")

        conn.execute(text("SET session_replication_role = 'origin';"))
        conn.commit()

    Base.metadata.create_all(bind=engine)

    session = SessionLocal()

    try:
        ranks_data = [
            'без разряда',
            '3 юн. раз.',
            '2 юн. раз.',
            '1 юн. раз',
            '3 раз.',
            '2 раз.',
            '1 раз.',
            'КМС',
            'МС',
            'МСМК',
            'ЗМС'
        ]

        for rank_name in ranks_data:
            session.execute(
                text("INSERT INTO public.ranks (name) VALUES (:name) ON CONFLICT DO NOTHING"),
                {"name": rank_name}
            )

        roles_data = ['PARTICIPANT', 'ORGANIZER', 'ADMIN']
        for role_name in roles_data:
            session.execute(
                text("INSERT INTO public.roles (name) VALUES (:name) ON CONFLICT DO NOTHING"),
                {"name": role_name}
            )

        age_categories_data = [
            ("Юниоры (14-15 лет)", 2011, 2012),
            ("Юниоры (16-18 лет)", 2008, 2010),
            ("Юниоры (19-21 лет)", 2005, 2007),
            ("Юниорки (14-15 лет)", 2011, 2012),
            ("Юниорки (16-18 лет)", 2008, 2010),
            ("Юниорки (19-21 лет)", 2005, 2007),
            ("Мужчины", 2009, None),
            ("Женщины", 2009, None)
        ]

        for name, min_year, max_year in age_categories_data:
            session.execute(
                text("""
                    INSERT INTO public.age_categories (name, min_year, max_year)
                    VALUES (:name, :min_year, :max_year)
                    ON CONFLICT DO NOTHING
                """),
                {"name": name, "min_year": min_year, "max_year": max_year}
            )

        weight_category_range = 5
        for weight in range(45, 115, 5):
            script = text(
                f"""
                    INSERT INTO public.weight_categories("name", min_weight, max_weight)
                    VALUES('{weight} кг', {weight - weight_category_range}, {weight})
                    ON CONFLICT DO NOTHING;
                """
            )
            session.execute(script)
            session.commit()

        script = text(
            f"""
                INSERT INTO public.weight_categories("name", min_weight, max_weight)
                VALUES('110+ кг', 110, null)
                ON CONFLICT DO NOTHING;
            """
        )
        session.execute(script)
        session.commit()

        script = text(
            f"""
                INSERT INTO public.users
                    (login, hash_password, "name", surname, patronymic, birth_date, "gender", role_id)
                    VALUES('admin@mail.ru', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 
                    'Егор', 'Егоров', 'Владимирович', '2004-07-04', 'MALE', 2)
                    ON CONFLICT DO NOTHING;
            """
        )
        session.execute(script)
        session.commit()

        script = text(
            f"""
                INSERT INTO public.users
                    (login, hash_password, "name", surname, patronymic, birth_date, "gender", role_id)
                    VALUES('user@mail.ru', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 
                    'Участник', 'Иванов', 'Иванович', '2004-07-04', 'MALE', 1)
                    ON CONFLICT DO NOTHING;
            """
        )
        session.execute(script)
        session.commit()

        script = text(
            f"""
                INSERT INTO public.competitions
                    (title, venue, "date", organizer_id)
                    VALUES('Чемпионат УР по армрестлингу', 'г. Ижевск, Кирова 13, Спортивный зал УдГАУ', 
                    '2026-06-09 09:00:00.000', 1)
                    ON CONFLICT DO NOTHING;
            """
        )
        session.execute(script)
        session.commit()

        random_surnames = ["Иванов", "Петров", "Егоров", "Сидоров", "Максимов"]
        random_names = ["Иван", "Петр", "Егор", "Николай", "Максим"]
        random_pat = ["Иванович", "Петрович", "Егорович", "Сидорович", "Максимович"]

        right_hand_list = list(range(1, 11))
        random.shuffle(right_hand_list)

        left_hand_list = list(range(1, 11))
        random.shuffle(left_hand_list)

        for i in range(8):
            script = text(
                f"""
                    INSERT INTO public.users
                        (login, hash_password, "name", surname, patronymic, birth_date, "gender", role_id)
                        VALUES('{i + 1}@mail.ru', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 
                        '{random.choice(random_names)}', 
                        '{random.choice(random_surnames)}', 
                        '{random.choice(random_pat)}', '2004-07-04', 'MALE', 1)
                        ON CONFLICT DO NOTHING;
                """
            )
            session.execute(script)
            session.commit()

            # Вставка заявки
            script = text(
                f"""
                    INSERT INTO public.applications
                        (age_category_id, weight_category_id, user_id, competition_id, weight, rank_id, team, created_at, update_at, status)
                        VALUES(3, 9, {i + 3}, 1, {round(random.uniform(80, 85), 2)}, {random.randrange(1, 10)},'ИжГТУ', 
                        '2026-05-08 05:49:43.963', '2026-05-08 05:49:43.963', 'APPROVED')
                        ON CONFLICT DO NOTHING;
                """
            )
            session.execute(script)
            session.commit()

            # Вставка результатов
            # script = text(
            #     f"""
            #         INSERT INTO public.results
            #             (participant_id, left_hand_place, right_hand_place)
            #             VALUES({i + 1}, {left_hand_list[i]}, {right_hand_list[i]})
            #             ON CONFLICT DO NOTHING;
            #     """
            # )
            # session.execute(script)
            # session.commit()

    except Exception as e:
        print(f"Error populating database: {e}")
        session.rollback()
        raise
    finally:
        session.close()