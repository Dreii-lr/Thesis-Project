from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, Field


class SequenceIDGenerator(SQLModel, table=True):
    __tablename__ = "sequence_table"
    id : int = Field(default=1,primary_key=True)





class SequenceIDGeneratorRepository:

    def __init__(self, _session : AsyncSession):
        self._session= _session

    async def get_next_value(self) -> int | None:
        stmt = select(SequenceIDGenerator.id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def add(self):
        self._session.add(SequenceIDGenerator())

    async def update(self):
        stmt =  update(SequenceIDGenerator).values(id=SequenceIDGenerator.id + 1).returning(SequenceIDGenerator.id)
        sequence_id = await self._session.execute(stmt)

        return sequence_id


